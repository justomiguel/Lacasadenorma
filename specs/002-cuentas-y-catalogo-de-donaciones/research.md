# Fase 0 — Investigación

La constitución pide que toda afirmación sobre una API que pudo cambiar se verifique contra
documentación oficial o ejecutándola, **no contra la memoria de nadie**. Lo que sigue es lo que se
verificó, con la fecha y la fuente, y las decisiones que salieron de ahí.

Verificado el 13 de septiembre de 2026.

---

## 1. API de Resend para los correos del producto

**Fuente**: `https://resend.com/docs/api-reference/emails/send-email`

- Endpoint: `POST https://api.resend.com/emails`
- Autenticación: `Authorization: Bearer re_…`
- Cuerpo: `from`, `to` (string o array, máximo 50), `subject`, `html`, `text`, `reply_to`, `headers`,
  `tags`, `attachments`. `from` acepta la forma `Nombre <correo@dominio>`.
- Respuesta: `{ "id": "…" }`, el identificador del envío.
- Idempotencia: header **`Idempotency-Key`**, único por request, **expira a las 24 horas**, máximo
  256 caracteres.

**Decisión.** El adaptador es un `fetch` con ese cuerpo. Nada de lo que necesita esta feature
—texto, asunto, un destinatario, idempotencia— requiere el SDK. Se manda `text` **y** `html`: si
sólo se manda `html`, Resend genera el texto solo, y preferimos escribir la versión de texto porque
es la que va a leer quien tenga las imágenes bloqueadas.

**Consecuencia de la expiración a las 24 horas.** La clave de idempotencia sirve para el reintento de
un envío que falló hace un minuto, no para garantizar "nunca dos veces en la vida". El recordatorio de
vencimiento se manda una sola vez por reserva y eso **no** se apoya en el header: se apoya en
`email_deliveries`, que es nuestro registro y no expira (FR-235).

## 2. SMTP de Resend para los correos de identidad

**Fuente**: `https://resend.com/docs/send-with-smtp`

- Host: `smtp.resend.com`
- Puertos: `25`, `587`, `2587` (STARTTLS) · `465`, `2465` (SSL/TLS implícito)
- Usuario: `resend` · Contraseña: la API key
- Requisito previo: **un dominio verificado**
- Header de idempotencia por SMTP: `Resend-Idempotency-Key`
- El límite de tasa por SMTP es el mismo que por API

**Decisión.** Puerto `587` con STARTTLS, que es lo que espera la configuración de SMTP de Supabase y
lo que atraviesa más redes sin problemas. El dominio verificado es un paso **bloqueante** del runbook,
previo a cualquier despliegue que habilite el registro.

## 3. Claves de configuración de Supabase Auth

**Fuente**: `https://supabase.com/docs/guides/local-development/cli/config`

| Clave | Default | Qué hace |
|---|---|---|
| `auth.enable_signup` | `true` | Permite o no crear cuentas. **Hoy este repo lo tiene en `false`** |
| `auth.email.enable_signup` | `true` | Ídem, específico de correo |
| `auth.email.enable_confirmations` | `false` | "If enabled, users need to confirm their email address before signing in" |
| `auth.email.max_frequency` | `1m` | Tiempo mínimo entre correos al mismo destino |
| `auth.email.otp_expiry` | `3600` | Vencimiento del código, en segundos |
| `auth.email.smtp.host` / `.port` / `.user` / `.pass` | `inbucket` / `2500` | SMTP propio |
| `auth.email.smtp.admin_email` / `.sender_name` | — | Remitente |
| `auth.rate_limit.email_sent` | **`2`** | Correos por hora. **"Requires `auth.email.smtp` to be enabled"** |
| `auth.rate_limit.sign_in_sign_ups` | `30` | Registros e inicios de sesión por IP cada 5 minutos |
| `auth.rate_limit.token_verifications` | `30` | Verificaciones de OTP por IP cada 5 minutos |
| `auth.site_url` / `auth.additional_redirect_urls` | — | Lista blanca de redirecciones de los enlaces del correo |

**Tres decisiones salen de esta tabla.**

1. **`enable_confirmations = true` es obligatorio**, y no sólo por higiene: es lo que hace que una
   cuenta sin correo confirmado **no tenga sesión**. Ver el punto 4.
2. **`rate_limit.email_sent` por defecto es 2 por hora**, y sólo se puede subir con SMTP propio. Dos
   personas registrándose la misma tarde agotan el cupo. Es la razón operativa —además de la del
   remitente— por la que el SMTP propio no es opcional (ADR-028).
3. `site_url` y `additional_redirect_urls` tienen que incluir las URLs de confirmación **de los dos
   idiomas** y las de preview de Vercel, o el enlace del correo rebota a la home sin explicación.

## 4. Cómo se sabe que un correo está confirmado (y cómo no)

**Fuente**: `https://supabase.com/docs/guides/auth/jwt-fields`

La referencia de claims lista los claims de un token: `sub`, `email`, `role`, `aal`, `session_id`,
`is_anonymous`, `app_metadata`, `user_metadata`, `amr`. **No hay un claim `email_verified` de primer
nivel.** En el token de ejemplo, lo que hay de la verificación aparece dentro de `user_metadata`.

Y `user_metadata` **lo escribe la propia persona** (es donde va el `data` de `updateUser`). La
constitución ya lo prohíbe como fuente de autorización —amenaza S3, el motivo de que el rol viva en
`app_metadata`— y acá se repetiría el mismo error con otro campo: `user_metadata.email_verified` no es
una garantía, es una declaración del interesado.

**Decisión.** La reserva **no comprueba ningún claim de verificación**. La garantía viene de antes:
con `enable_confirmations = true`, una cuenta sin confirmar no puede iniciar sesión, así que *tener
sesión ya implica correo confirmado*. `claim_donation_item()` comprueba `auth.uid() is not null` y
nada más sobre la identidad, y el comentario de la función dice por qué, para que nadie agregue el
chequeo de `user_metadata` creyendo que refuerza algo.

**Nota sobre `is_anonymous`.** Sí es un claim de primer nivel y sí sería confiable. No se usa porque
los sign-ins anónimos quedan deshabilitados (ADR-027); queda anotado por si alguien alguna vez los
habilita, porque ese día las policies de propiedad tendrían que excluirlos.

## 5. Concurrencia: por qué alcanza un `update` condicional

**Fuente**: documentación de Postgres sobre `READ COMMITTED`, más la prueba que se escribe en
`supabase/tests/070-catalogo.sql`.

En `READ COMMITTED` —el nivel por defecto, y el que usa PostgREST— cuando dos transacciones intentan
actualizar la misma fila, la segunda **espera** a que la primera termine, y al desbloquearse
**reevalúa su condición `WHERE` sobre la versión nueva** de la fila. Ese comportamiento es justo lo
que hace falta: la segunda reserva ve el contador ya incrementado y su `WHERE` no se cumple, así que
actualiza cero filas y la función levanta el error de "alguien se adelantó".

Es decir: la carrera se pierde en el `update`, no en un `select` anterior, y por eso no hay ventana.

Lo que **no** hace falta: `SERIALIZABLE` (habría que pedirlo por request a través de PostgREST y
manejar fallos de serialización con reintentos), ni `select … for update` (el `update` ya toma ese
lock), ni un lock de asesoría.

Lo que sí hace falta además: el `check` de tabla. El `update` condicional protege el camino que
pasa por la función; el `check` protege todos los demás caminos, incluidos los que no existen todavía.

## 6. Privilegios de columna, RLS y `security_invoker`

**Verificado ejecutando** sobre PostgreSQL 17.11 local (`scripts/db-local.sh`), no sólo leído. El
prototipo y su salida están en el punto 9.

- `grant select (col_a, col_b) on tabla to rol` funciona: nombrar cualquier otra columna falla con
  **`42501: permission denied for table <tabla>`**. Conviene anotar el mensaje exacto, porque no es el
  que uno esperaría: Postgres dice "for table" y no "for column" aunque la denegación sea por
  columna. Una prueba que espere la frase equivocada pasa en verde por el motivo equivocado.
- RLS y privilegios son **independientes y acumulativos**: la policy decide filas, el `grant` decide
  columnas, y hacen falta los dos. Una policy permisiva no otorga el privilegio, y el privilegio no
  sortea la policy.
- Una vista con `security_invoker = true` se evalúa con los privilegios y las policies **de quien
  consulta**, así que hereda las dos barreras. Sin esa opción —el default— la vista corre con los
  privilegios de su dueño y **sortea RLS**, que es la trampa que `data-model.md` de la feature 001 ya
  documenta para `campaign_totals`.
- `select *` sobre una vista que sólo proyecta columnas otorgadas funciona, y `select *` sobre la
  tabla falla. Es la propiedad que hace útil el privilegio de columna: la vista es el único camino.

**Decisión.** Las tres capas juntas para el muro (ADR-030), y la regla 4 de `check-rls.mjs`
verificando que ninguna vista sobre una tabla con datos personales se cree sin `security_invoker`.

## 7. `pg_cron` y el entorno local

`pg_cron` está disponible en Supabase y **no** en el Postgres de `apt` que levanta
`scripts/db-local.sh` (ADR-013). Consecuencia práctica, y es la razón de que el vencimiento se diseñe
como se diseñó: la **función** `release_expired_holds()` se prueba localmente llamándola directo, y
el **agendamiento** no se prueba localmente en absoluto.

Si la corrección del catálogo dependiera del cron, tendríamos una propiedad crítica sin cobertura
local, verificable sólo en producción. Por eso `claim_donation_item()` libera lo vencido del ítem que
va a tocar antes de tocarlo: la propiedad importante queda probada en la suite, y el cron pasa a ser
una mejora cosmética de lo que se ve sin que nadie reserve (ADR-029).

## 8. Prototipo: lo que se probó ejecutando

Antes de escribir el modelo de datos definitivo se levantó el esquema propuesto sobre el Postgres
local, con las migraciones de la feature 001 ya aplicadas, y se atacó. El prototipo es desechable y
no se commitea; lo que queda es lo que enseñó, y la salida completa está en
`prototipo-catalogo-verificacion.log`.

| Qué se probó | Resultado |
|---|---|
| `has_min_role('auditor')`, `can_read_ledger()` y `can_read_donors()` con una sesión sin fila en `user_roles` | Las tres devuelven `false`. La premisa de ADR-027 se sostiene |
| Esa misma sesión leyendo `contributions`, con una fila cargada | **0 filas, sin error.** La policy es la única barrera: el privilegio de tabla está otorgado. Es exactamente la capa que se pierde al abrir el registro, y el motivo de que exista `check:rls` |
| Esa sesión insertando en `campaigns` | `ERROR: new row violates row-level security policy for table "campaigns"` |
| Esa sesión insertando en `donation_pledges`, para sortear la función | `ERROR: permission denied for table donation_pledges`. Sin privilegio de `insert`, la función es el único camino |
| `anon` leyendo las cinco columnas otorgadas del muro | Funciona |
| `anon` leyendo `user_id`, `donor_note`, o `select *` | `42501` en los tres casos |
| Un `update` de **superusuario** dejando `reserved_quantity` por encima de lo necesario | `ERROR: … violates check constraint "donation_items_not_oversubscribed"`. La sobreventa es inalcanzable, no improbable |
| Bajar `needed_quantity` por debajo de lo ya comprometido | Falla con el mismo `check`. Confirma que la capa de aplicación tiene que traducir ese error a una frase (US4 escenario 5) |
| **Dos sesiones concurrentes** reservando la última unidad | La segunda **esperó 2,013 s** el lock de la primera, reevaluó su `WHERE` y falló con `sin_disponibilidad`. Quedó **una** reserva y `remaining = 0` |
| El muro visto por `anon` con una donación entregada con nombre y otra entregada anónima | Devuelve **una sola** fila, la que tiene nombre. La anónima no aparece (FR-228) |
| Vencimiento sin cron: 35 unidades bloqueadas por una reserva vencida, y alguien reserva 30 | La función liberó las 35, marcó la reserva como `expired` y entregó las 30. El catálogo quedó consistente **sin que ningún proceso programado corriera** (FR-218) |

Dos cosas cambiaron por haber prototipado: el mensaje de error de los privilegios de columna (punto
6) y la confirmación de que el `update` condicional no necesita ninguna ayuda para serializar, que
era la duda que justificaba mirar `SERIALIZABLE`.

## 9. Lo que se decidió no investigar

| Tema | Por qué no |
|---|---|
| Proveedores de captcha | Fuera de alcance de esta versión; agregar uno sumaría un tercero, un logo obligatorio por la regla de marcas, y una decisión de privacidad. Riesgo aceptado con disparador de revisión |
| OAuth con Google | Revisitado: el pedido llegó después. La decisión está en [ADR-039](../../docs/adr/039-oauth-nativo.md). No se investigó un SDK propio: Auth ya habla OAuth |
| `react-email` y motores de plantillas | Seis correos de párrafos. Ver ADR-028 |
| Webhooks de Resend (rebotes, quejas) | Útil con volumen. Con decenas de correos por semana, `email_deliveries` más la consola del proveedor alcanzan. Anotado como el paso siguiente si aparecen rebotes |
| Colas y workers | Ver ADR-028: infraestructura para un problema que este sitio no tiene |
