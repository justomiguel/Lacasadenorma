# Privacidad

Este documento dice qué datos toca el proyecto, dónde quedan y por cuánto tiempo. Es el respaldo
técnico de la página pública [`/legales/privacidad`](../content/legales.json): si los dos textos se
contradicen, el que está mal es este, porque el público es una promesa hecha a quien colabora.

La regla de la que sale todo lo demás está en la constitución, principio V y sección 20 del
encargo: **recolectar la mínima información posible**. En un sitio donde la gente va a transferir
plata por confianza, cada dato que se guarda es una razón más para desconfiar.

---

## 1. Lo que el sitio no hace

Vale empezar por acá porque es la mayor parte de la respuesta.

| No existe | Consecuencia |
|---|---|
| Ningún formulario público | No hay nada que una visita pueda escribir y que quede guardado |
| Registro, cuentas, newsletter | Nadie deja un correo electrónico |
| Procesamiento de pagos en el sitio | La transferencia se hace en el homebanking de cada uno; el sitio nunca ve un número de tarjeta, un CBU ajeno ni un monto |
| Cookies de publicidad, píxeles sociales, servicios de perfilado | No hay `<script>` de terceros más que el de analítica, y sólo si se configura |
| Trackers de sesión, mapas de calor, grabación de pantalla | No se instalaron y no están previstos |
| Consentimiento de cookies | No hace falta: las únicas cookies son de sesión en `/admin`, y son estrictamente necesarias |

No hay banner de cookies porque no hay cookies que consentir. Un banner que pide permiso para nada
es peor que no tenerlo: entrena a la gente a aceptar sin leer.

---

## 2. Analítica

### Qué se emite

Los eventos están enumerados en el tipo `AnalyticsEvent`
(`src/domain/ports/analytics.ts`). El tipo es la lista completa: agregar un evento obliga a editar
el dominio, que es donde se nota.

| Evento | Propiedades | Dónde se emite |
|---|---|---|
| `ayudar_click` | `origen` (la sección desde la que se hizo clic) | `components/campaign/help-cta.tsx` |
| `metodo_visto` | `pais` (`AR`, `CL`) | `components/campaign/donation-board.tsx`, al cambiar de país |
| `dato_copiado` | `pais`, `campo` (`alias`, `cbu`, `cuenta_argentina`, `rut`, `cuenta_chile`, `email`) | `components/campaign/donation-board.tsx`, al copiar. Nunca el valor |
| `compartir` | `canal` (`whatsapp`, `enlace`, …), `ruta` | `components/campaign/share-block.tsx` |
| `whatsapp_click` | `origen` | `components/campaign/contact-actions.tsx` |
| `llamar_click` | `origen` | `components/campaign/contact-actions.tsx` |
| `medio_externo_click` | `medio` (`mercadopago` o `paypal`) | `components/campaign/donation-board.tsx`, sólo si hay URL real |

Ninguna propiedad lleva un valor escrito por una persona. `campo` es la **etiqueta** del dato
bancario, no el dato: se emite `{ pais: "AR", campo: "cbu" }`, nunca el CBU. Hay un test de
`CopyField` que verifica que lo que va al portapapeles sea el dato exacto, y la etiqueta es lo único
que viaja al evento.

No existe un evento de "vio la transparencia" ni de "leyó una novedad": eso es una vista de página
con otro nombre, y el proveedor ya las cuenta. Un evento declarado y no emitido es una afirmación falsa
sobre lo que el sitio mide.

### Qué se envía hoy: nada

No hay proveedor configurado. Con las variables de entorno vacías:

- `getAnalyticsScript()` devuelve `null` (`src/infrastructure/analytics/browser.ts`),
- `AnalyticsScript` no renderiza nada (`components/site/analytics.tsx`),
- `track()` no encuentra la global del proveedor y **sale sin hacer nada**.

Es decir: los eventos se disparan en el navegador, no encuentran a dónde ir y se descartan
en el acto. No se acumulan, no se reintentan, no se guardan en `localStorage`. El sitio funciona
completo en ese estado y es el estado por defecto.

### Cómo se configura, si se decide configurarlo

Hacen falta **las dos** variables, y si falta una no se carga nada:

```
NEXT_PUBLIC_ANALYTICS_SCRIPT_URL=https://plausible.io/js/script.js
NEXT_PUBLIC_ANALYTICS_DOMAIN=lacasadenorma.org
```

El origen del script se agrega solo a `script-src` y `connect-src` de la CSP, derivado de la URL en
`next.config.ts`. No hay que tocar la política a mano — y no hay que olvidarse de que la CSP existe:
sin esa derivación, el script se inyectaría y el navegador lo bloquearía en silencio.

El adaptador no instala ningún SDK. Llama la global `plausible(name, { props })`, que es el
contrato que implementan Plausible, Umami y varios más. Elegir proveedor es cambiar dos variables,
no cambiar código.

Al elegirlo hay tres obligaciones que no son técnicas:

1. **Verificar que no ponga cookies ni identificadores persistentes.** La página pública promete que
   no se guarda un identificador que siga a nadie entre visitas. Un proveedor que lo haga convierte
   esa frase en mentira.
2. **Verificar que no guarde la dirección IP completa.** La página pública también promete eso, y es
   la única de sus promesas que no depende del código de este repositorio.
3. **Escribir en la página pública quién es y cuánto tiempo retiene.** Hoy no se nombra ninguno
   porque no hay ninguno.

### Por qué la página pública habla en presente

`/legales/privacidad` dice "se cuentan visitas y algunos eventos de uso" aunque hoy no se cuente
nada. Es deliberado: describe el **techo** de lo que el sitio puede llegar a recolectar. Una página
que dijera "hoy no se mide nada" quedaría desactualizada el día que alguien defina dos variables de
entorno, y nadie se acordaría de editarla. Prometer poco y cumplir es mejor que prometer nada y
después corregir.

---

## 3. Cookies

Las únicas cookies del proyecto son las de sesión de Supabase Auth, y sólo aparecen en `/admin`.

| Cookie | Quién la escribe | Alcance | Para qué |
|---|---|---|---|
| `sb-*-auth-token` (y su par de refresh) | Supabase Auth, vía `proxy.ts` y `src/infrastructure/supabase/server-client.ts` | Primera parte, `HttpOnly`, `Secure` en producción | Mantener la sesión de quien administra |

Las páginas públicas **no leen ninguna cookie**. `createAnonSupabaseClient()` se construye con un
almacén de cookies vacío a propósito: sin eso, una lectura pública podría acabar dependiendo de la
sesión de quien está mirando, y una página que cambia según quién la abre no se puede cachear ni
razonar. Es también lo que hace que el HTML público sea idéntico para todo el mundo.

---

## 4. Datos personales en la base

El proyecto **no tiene** ninguna columna de correo electrónico, dirección IP ni user-agent. Se puede
verificar leyendo `supabase/migrations/`: no aparecen. Los correos de quienes administran existen
sólo en `auth.users`, que lo gestiona Supabase y a lo que la aplicación nunca escribe.

Lo único identificable que la aplicación guarda es lo que una persona del equipo escribe a mano en
el backoffice:

| Columna | De dónde sale | Se publica |
|---|---|---|
| `contributions.source_note` | Referencia interna de conciliación con el banco, tipeada en el formulario de aportes | **No.** Ninguna vista pública la expone |
| `expenses.supplier` | Nombre del proveedor o comercio | Sí, en `/transparencia`: es parte de la rendición |
| `expense_receipts.file_name` | Nombre del archivo subido | Sólo su existencia y su cantidad |
| `contributions.recorded_by`, `expenses.recorded_by`, `expense_receipts.uploaded_by`, `media.uploaded_by`, `user_roles.granted_by`, `audit_log.actor_id` | `default auth.uid()` en la base | No. Son procedencia interna, para que cada asiento tenga responsable |

Los nombres individuales de quienes aportan y sus montos **nunca se publican**. El total recibido
sale de una vista agregada (ADR-016), no de la tabla: no es una decisión de presentación que alguien
pueda revertir sin darse cuenta, es que el camino de lectura pública no llega a la fila. Ninguna fila
de `contributions` es legible por el rol `anon`, y hay pruebas de pgTAP que lo verifican.

Dos columnas de esa tabla merecen una aclaración porque parecen identificar y hoy no lo hacen:

- **`is_anonymous`** es `not null default true`, y el formulario de aportes no la expone. Es decir:
  todo aporte que se registre hoy queda anónimo, y el caso seguro es el que ocurre cuando nadie
  decide nada.
- **`contributor_display_name`** existe en el esquema y **no tiene quien la escriba**: ningún
  formulario la carga y ningún camino de lectura la trae. La migración lo dice en su propio
  comentario, "sólo con consentimiento explícito, no se usa en esta versión". Está reservada para el
  día en que alguien quiera figurar y lo pida; mientras eso no exista como pantalla, la columna está
  vacía en todas las filas.

La columna de procedencia (`recorded_by` y sus hermanas) es la única concesión: identifica a alguien
del equipo, no a quien colabora, y existe porque una rendición de cuentas sin responsable por asiento
no es auditable.

---

## 5. Comprobantes

Los archivos de comprobantes viven en un bucket **privado** de Supabase Storage. La página de
transparencia publica que existen y cuántos son; el archivo no se sirve nunca en público.

Quien tenga rol `auditor` puede pedir un enlace firmado y temporal. Ese enlace lo emite el servidor,
caduca, y su emisión queda en `audit_log`. Un comprobante puede tener el nombre de un proveedor, un
número de factura y a veces un domicilio: publicarlo entero para probar honestidad sería exponer
datos de un tercero que no los cedió para eso.

---

## 6. Registros y errores

El logger estructurado (`src/infrastructure/logging/logger.ts`) redacta por clave antes de escribir.
La lista de claves redactadas está en el código y hay un test que la cubre. Un log con el CBU
completo o con un token de sesión es un dato personal filtrado a un lugar que nadie audita, y los
logs se leen en incidentes, que es cuando menos cuidado se tiene.

Lo que se registra de una visita pública es lo que registra Vercel por su cuenta —método, ruta,
código de estado, duración— y no lo controla la aplicación. Vale saberlo: existe, y es información
que el proyecto no eligió recolectar pero tampoco puede negar.

---

## 7. Retención

| Dato | Cuánto queda |
|---|---|
| Aportes, gastos, comprobantes, hitos, novedades | Mientras la campaña esté abierta y por el plazo que exija la rendición de cuentas |
| `audit_log` | Igual que lo anterior: es lo que permite reconstruir quién hizo qué |
| Sesiones de `/admin` | Hasta que caducan o quien administra cierra sesión |
| Eventos de analítica | Hoy, cero segundos: no salen del navegador. Con proveedor configurado, lo que retenga el proveedor, y eso hay que escribirlo en la página pública |

Cuando la campaña cierre, la decisión de qué se archiva y qué se borra es de la familia, no técnica.
Lo que el proyecto tiene que garantizar es que sea **posible**: no hay datos personales dispersos en
logs, en un CMS de terceros ni en un servicio de formularios, así que borrar es borrar filas y
archivos de un bucket.

---

## 8. Derechos de las personas

No hay usuarios registrados, así que la mayoría de los pedidos habituales no tienen a qué aplicarse.
Los dos que sí:

- **Quien aportó y no quiere figurar en el registro interno.** Hoy ya no figura: los aportes se
  registran anónimos y el nombre no se guarda. Lo único que queda de la operación es la referencia
  de conciliación con el banco, que es lo que permite cuadrar el total.
- **Un proveedor que aparece en `/transparencia`.** Su nombre está ahí porque es parte de rendir
  cuentas de plata de otros. Si pide que no figure, se evalúa caso por caso; lo que no se puede es
  borrar el gasto.

La página pública todavía no publica una dirección de contacto. Es una deuda declarada y está
anotada en el contenido (`content/legales.json`), no disimulada: una política de privacidad sin
forma de ejercerla está incompleta.

---

## 9. Qué revisar antes de cada despliegue

- ¿Se agregó un formulario público? Entonces hay datos personales nuevos y esta página cambia.
- ¿Se agregó un evento de analítica? Tiene que estar en el tipo `AnalyticsEvent`, en la tabla de la
  sección 2 y en la página pública.
- ¿Se configuró un proveedor? Nombrarlo en `/legales/privacidad` con su retención.
- ¿Se agregó una columna con algo que una persona escribe? Va a la tabla de la sección 4, con su
  respuesta a "¿se publica?".
- ¿Se agregó un script de terceros? Necesita su origen en la CSP, y la CSP es la última defensa
  contra un tercero que empiece a hacer más de lo que decía.

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`security.md`](./security.md) | Las cuatro fronteras, RLS, cabeceras y la redacción de logs |
| [`adr/010-analytics-privacidad.md`](./adr/010-analytics-privacidad.md) | Por qué esta analítica y no otra |
| [`adr/016-totales-recibidos-agregados.md`](./adr/016-totales-recibidos-agregados.md) | Por qué el total sale de una vista y no de la tabla de aportes |
| [`../specs/001-sitio-publico-campana/threat-model.md`](../specs/001-sitio-publico-campana/threat-model.md) | Amenazas, incluidas las de exposición de datos |
