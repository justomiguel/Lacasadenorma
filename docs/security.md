# Seguridad

Dónde están las fronteras, qué protege cada una, y qué está aceptado como riesgo.

El modelo de amenazas completo —treinta y cinco amenazas con su mitigación y su verificación— está en
[`specs/001-sitio-publico-campana/threat-model.md`](../specs/001-sitio-publico-campana/threat-model.md).
Este documento es el mapa operativo: qué hay implementado, dónde, y cómo se comprueba.

Antes de todo, el peor caso. No es una filtración de datos: **es que alguien logre cambiar un dato
bancario publicado y desvíe los aportes de la campaña.** Toda la jerarquía de controles sale de ahí. El
segundo peor caso es que se filtre un comprobante o la identidad de quien aportó. La tercera es que el
sitio muestre una cifra falsa y pierda la única cosa que tiene: que se le crea.

---

## 1. Las fronteras, en orden de importancia

Hay cuatro, y sólo una es infranqueable. Conviene saber cuál:

| # | Frontera | Dónde | Qué protege | Se puede saltear |
| --- | --- | --- | --- | --- |
| 1 | **Policies RLS** | `supabase/migrations/20260909120400_rls_policies.sql` | Todo. Es la última palabra | No |
| 2 | Guardas de sesión y permiso | `src/infrastructure/auth/guards.ts`, `src/application/admin/core.ts` | Que la interfaz no ofrezca lo que la base va a negar, y que el rechazo tenga un mensaje | Sí, olvidándose de llamarlas |
| 3 | Validación con Zod | `src/application/admin/*`, `content/schema.ts` | Que un dato mal formado no llegue a la base | Sí, con otra ruta |
| 4 | `proxy.ts` | raíz | **Nada.** Refresca la sesión y redirige por comodidad | Sí, trivialmente |

La numeración importa porque la tentación es la inversa: el redirect de `proxy.ts` es lo primero que se
ve y parece la protección. No lo es, y el archivo lo dice en su propio comentario. No protege por tres
razones concretas: sólo mira si **existe** una sesión y no qué rol tiene; no corre en las Server
Actions, que son endpoints HTTP invocables por su ID; y el `matcher` es una lista de rutas que se puede
quedar corta cuando alguien agregue una. Es la lección de CVE-2025-29927.

Las guardas de la frontera 2 se llaman **en cada carga y en cada acción**, no una vez en el layout. En
el App Router el layout no se vuelve a ejecutar al navegar entre páginas hermanas, así que una
comprobación hecha sólo ahí protege la primera pantalla y nada más. Hay dos formas y hacen falta las
dos:

| Función | Qué hace | Para qué |
| --- | --- | --- |
| `requireViewer()` | Redirige a `/admin/login` si no hay sesión | Páginas |
| `requirePermission(p)` | Redirige a `/admin/sin-permiso` si el rol no alcanza | Páginas |
| `assertPermission(p)` | Lanza `NotAuthorizedError` | Server Actions, donde un redirect dejaría la mutación a medio camino sin decir nada |

---

## 2. Identidad y rol

Autenticación por correo y contraseña con Supabase Auth ([ADR-003](./adr/003-autenticacion.md)). Dos
decisiones que hacen la diferencia:

**`getClaims()`, nunca `getSession()`.** El segundo devuelve lo que hay en la cookie sin validar nada;
el primero verifica la firma del JWT. Se usa en `readViewer()`, en `proxy.ts` y en cada guarda.

**El rol viene de `app_metadata`, nunca de `user_metadata`.** `user_metadata` lo puede escribir la
propia persona a través de la API de auth: leer el rol de ahí sería dejar que cualquiera se ascienda a
`owner`. El claim `user_role` lo inyecta un `custom_access_token_hook` que lee la tabla `user_roles`
([ADR-004](./adr/004-rbac.md), amenaza S3). Hay una suite pgTAP entera dedicada a esto
(`050-roles-y-token.sql`), y una de sus aserciones verifica explícitamente que `user_metadata` se
ignore.

**El hook lo ejecuta `supabase_auth_admin`, y hay que darle los privilegios exactos.** El hook no es
`security definer` a propósito —así no se puede usar para escalar—, lo que significa que corre con los
privilegios del servidor de auth. `20260910090000` le otorga dos cosas y nada más: `usage` sobre el
esquema `private` y `execute` sobre `private.role_rank`. Es el mínimo privilegio que hace falta para
resolver el rol; no incluye lectura de ninguna tabla más allá de `user_roles`, que el hook ya podía
leer. La migración existe porque el hook fallaba con `permission denied for schema private` en cuanto lo
invocaba ese rol: ninguna sesión se habría podido emitir. Lo cubren una aserción de
`050-roles-y-token.sql` y el flujo 9 de la suite E2E.

### La matriz de permisos

`src/domain/permissions.ts` es un **espejo** de la matriz de RLS, no la frontera. Existe para que el
backoffice no le muestre a un editor un botón que la base va a rechazar: un formulario que falla al
enviarse es peor que un formulario que no aparece.

| Permiso | auditor | editor | admin | owner |
| --- | :-: | :-: | :-: | :-: |
| `backoffice.acceder` | ✓ | ✓ | ✓ | ✓ |
| `finanzas.leer` | ✓ | · | ✓ | ✓ |
| `finanzas.escribir` | · | · | ✓ | ✓ |
| `contenido.escribir` | · | ✓ | ✓ | ✓ |
| `hitos.escribir` | · | ✓ | ✓ | ✓ |
| `campana.escribir` | · | · | ✓ | ✓ |
| `cuentas.escribir` | · | · | · | ✓ |
| `auditoria.leer` | ✓ | · | ✓ | ✓ |
| `roles.escribir` | · | · | · | ✓ |

`can(null, cualquierCosa)` es siempre `false`.

Dos filas explican la forma de toda la tabla. **`cuentas.escribir` es sólo de `owner`**: quien pueda
cambiar un CBU puede desviar todos los aportes, y no hay ninguna razón para que un `admin` lo pueda
hacer (amenaza T1). Y **`auditor` es lectura total sin ninguna escritura**, que es el motivo de que los
permisos se declaren uno por uno en lugar de derivarse de la jerarquía numérica: con
`hasMinRole('auditor')` a secas, un auditor pasaría cualquier comprobación de "al menos auditor",
incluidas las de escritura.

`roles.escribir` existe en la tabla y **no tiene pantalla**. Los roles se otorgan con SQL contra la
tabla `user_roles`, y está en [`docs/runbook.md`](./runbook.md#5-dar-y-quitar-acceso). Es deliberado:
con cuatro personas, una pantalla para la operación más peligrosa del sistema es más superficie de
ataque que ahorro de trabajo.

---

## 3. RLS: la frontera de verdad

RLS habilitado en las trece tablas, y `010-estructura.sql` falla si alguien agrega una tabla sin
habilitarlo. Los patrones que se repiten:

| Patrón | Cómo se ve | Por qué |
| --- | --- | --- |
| Lectura pública sólo de lo publicado | `using (published_at is not null)` para `anon` | Los borradores no tienen camino de lectura pública (amenaza I7) |
| Sin policy = denegado | `contributions` y `expense_receipts` no tienen ninguna policy para `anon` | La ausencia es la protección, y no se puede "olvidar de filtrar" |
| `UPDATE` siempre con `USING` **y** `WITH CHECK` | En cada policy de update | Sin `WITH CHECK` se puede reasignar la fila a otro dueño (amenaza E4) |
| Nada financiero se borra | `contributions` y `expenses` no tienen policy de `DELETE` | Se anulan con `voided_at` y `void_reason` (FR-015) |
| `audit_log` append-only, y sólo por función | `authenticated` tiene **sólo `SELECT`** sobre la tabla; se escribe llamando a `public.record_audit(…)`, que es `security definer` | Un rastro que se puede editar no es un rastro (amenaza T2), y el rol que hace una operación auditada no siempre es el rol que puede leer el rastro ([ADR-019](./adr/019-auditoria-por-funcion.md)) |
| Vistas con `security_invoker` | `campaign_totals` | Una vista bypasea RLS por defecto: sin esto, expondría el detalle que la tabla niega (amenaza I3) |
| Funciones en el esquema `private` | `has_min_role`, `can_read_ledger`, `role_rank` | Postgres otorga `EXECUTE` a `PUBLIC` por defecto; llevan `set search_path = ''` y `revoke execute … from public, anon, authenticated` (amenaza E3) |
| Lo `security definer` verifica el rol en su primera línea | `public.record_audit` | Una función `security definer` corre con los privilegios de su dueño: sin esa comprobación sería una escalada (amenaza E3). Y el `grant execute` va a `authenticated`, nunca a `anon` |
| Grants explícitos | Al final de `20260909120400` | `anon` no tiene `SELECT` sobre `contributions`, `expense_receipts`, `user_roles` ni `audit_log` |

Hay una trampa de Postgres que vale conocer porque produce fallos silenciosos: **un `UPDATE` necesita
leer la fila primero**, así que una tabla con policy de `UPDATE` y sin policy de `SELECT` devuelve cero
filas modificadas y ningún error (amenaza E5). Está cubierto en
`030-matriz-de-permisos.sql`.

### El total recibido no sale del detalle

`anon` no puede leer `contributions` en absoluto. Lo público es `campaign_totals`, una vista con
`security_invoker = true` que devuelve totales por moneda ([ADR-016](./adr/016-totales-recibidos-agregados.md)).
El puerto de lectura tampoco ofrece un método para pedir el detalle: la ausencia sube por toda la
arquitectura hasta que ya no hay forma de pedir lo que no se debe publicar (FR-014, amenaza I2).

---

## 4. Los comprobantes

Es el dato más sensible que el sistema guarda, porque un comprobante tiene el nombre de un proveedor,
importes y a veces datos de una persona.

| Aspecto | Cómo está |
| --- | --- |
| Bucket | `comprobantes`, `public = false` |
| Lectura para `anon` | Ninguna policy. No existe |
| Lectura autenticada | `private.can_read_ledger()`: auditor, admin y owner. **No** editor |
| Escritura | `admin` o superior |
| `UPDATE` | Ninguna policy: un comprobante no se reescribe |
| `DELETE` | Sólo `owner` |
| Cómo se sirve | `app/admin/comprobantes/[id]/route.ts` pide una URL firmada de corta duración, la descarga **en el servidor** y transmite el cuerpo |
| Qué ve el público | Sólo la **cantidad**, en `expenses.receipt_count`, derivada por trigger |

La URL firmada nunca llega al navegador, y por eso la ruta transmite en lugar de redirigir. Las
respuestas de error están elegidas: **403** con el mensaje de sesión o de permiso cuando la persona
está identificada y no le corresponde, y **404** con `"Ese comprobante no existe o no lo podés ver."`
cuando no se encuentra —el mismo texto para las dos causas, para no confirmar la existencia de un
comprobante a quien no puede verlo—.

Un detalle que costó encontrar y que está anotado en `proxy.ts`: esta ruta queda **fuera** del redirect
optimista. No es una página, devuelve un archivo, y un 307 hacia el HTML de la pantalla de acceso
contestando a una descarga se ve como un archivo roto. Contesta 403 con un mensaje, que dice más. No
debilita nada: el permiso lo comprueba el caso de uso, y abajo de todo la policy del bucket.

---

## 5. Cabeceras

Todas se declaran en `next.config.ts` y se aplican a `/:path*`.

| Cabecera | Valor |
| --- | --- |
| `Content-Security-Policy` | ver abajo |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cache-Control` en `/admin/*` | `private, no-store` |

La CSP, directiva por directiva:

```
default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none';
object-src 'none'; img-src 'self' data: blob: <supabase>; font-src 'self';
style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' <analítica>;
connect-src 'self' <supabase> <analítica>; manifest-src 'self';
upgrade-insecure-requests
```

Los orígenes externos **se derivan de las variables de entorno**: sin proyecto de Supabase y sin
analítica configurada, la política no permite ningún tercero. Eso hace que un clon nuevo del
repositorio tenga la política más cerrada posible, no la más abierta.

Tres cosas que hay que saber antes de editar este archivo:

- **`'unsafe-inline'` en `script-src` es deuda declarada.** Next emite los datos del servidor en
  scripts en línea en cada página. Con nonces, cada respuesta deja de ser cacheable en el borde —o el
  nonce se reusa, que es lo mismo que no tenerlo—, y el HTML público cacheado es lo que sostiene al
  sitio en un pico de difusión (amenaza D1). Está en los riesgos aceptados del modelo de amenazas.
- **`'unsafe-eval'` sólo en desarrollo.** React lo necesita para el refresco en caliente. En el build
  de producción no está.
- **`upgrade-insecure-requests` y HSTS se omiten cuando `NEXT_PUBLIC_SITE_URL` empieza con `http://`.**
  Sin variable configurada se asume https, que es producción: la duda se resuelve del lado seguro. El
  motivo de la omisión está en [`docs/testing.md`](./testing.md#los-tres-navegadores) y vale leerlo
  antes de "arreglar" la condición.
- **No se envía `Origin-Agent-Cluster: ?0`.** Desactivaría WebMCP y debilitaría la frontera de origen
  ([ADR-008](./adr/008-webmcp.md)).

---

## 6. Validación de entrada

Toda entrada se valida **del lado del servidor**, aunque el formulario ya la haya validado (FR-023).

| Origen | Dónde se valida | Cuándo |
| --- | --- | --- |
| `content/*.json` | `content/schema.ts` con `parseContent()` | Al importar el módulo, o sea al construir. Un campo mal escrito rompe el build |
| Formularios del backoffice | Un esquema de Zod por operación, dentro de `perform()` | En cada envío, antes de tocar la base |
| Parámetros de la API pública | El esquema de cada capacidad, con `z.strictObject` | En cada pedido |
| Filas leídas de la base | `paymentFieldsSchema` en `mappers.ts` | Al mapear el `jsonb` de `payment_methods` |

Los esquemas son `strictObject`: una clave desconocida es un **400**, no un campo ignorado. Es lo que
hace que una entrada inesperada se note en lugar de pasar de largo (amenaza A4).

`src/application/admin/fields.ts` concentra los campos que se repiten —montos, fechas no futuras,
UUID, slugs, checkboxes, motivos de anulación— para que la validación de una pantalla nueva no dependa
de que alguien se acuerde. Los montos se parsean con `parseAmount()`, que entiende el formato es-AR
(`.` de miles, `,` de decimales) y devuelve unidades mínimas enteras.

### Archivos

`src/infrastructure/files/image.ts` valida **por contenido, no por extensión ni por el `Content-Type`
que declara el cliente**. `sniffFileType()` lee los bytes de cabecera y reconoce JPEG, PNG, WebP, AVIF
y `%PDF-`. Un SVG es XML y no tiene firma binaria, así que devuelve `null` y se rechaza (amenaza T6);
hay un test que sube un SVG renombrado a `.png` y verifica que no pase. El límite de tamaño se aplica
en el servidor antes de guardar, y la ruta en el bucket es un UUID: el nombre original nunca se usa
como path.

### Cuerpos de texto

El cuerpo de las novedades es un subconjunto de Markdown parseado a nodos tipados
(`src/domain/rich-text.ts`). **No hay un tipo de nodo HTML**, así que `<script>` queda como texto y
React lo escapa. Los enlaces pasan por una lista blanca: `https:`, `mailto:`, `/` y `#`; cualquier otro
esquema degrada a texto plano. Y además, el esquema de guardado rechaza el cuerpo si contiene algo con
forma de etiqueta, antes de que llegue a la base.

Hay **un solo** `dangerouslySetInnerHTML` en todo el código de producción, en
`components/site/structured-data.tsx`, y el comentario del archivo explica por qué es seguro: el JSON-LD
tiene que salir sin escapar o queda inválido, y todo lo que entra viene de contenido versionado en el
repositorio o de campos de la base que ya son texto plano. Si algún día un dato de ahí viniera de un
formulario, ese comentario deja de ser cierto.

---

## 7. Secretos

| Variable | Llega al navegador | Dónde se usa |
| --- | :-: | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Cliente de Supabase, CSP, `remotePatterns` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí, a propósito | Cliente de Supabase. La protección es RLS, no el secreto de esta clave |
| `NEXT_PUBLIC_SITE_URL` | Sí | Canónicas, sitemap, JSON-LD, OpenGraph |
| `NEXT_PUBLIC_ANALYTICS_*` | Sí | Script del proveedor y su origen en la CSP |
| `SUPABASE_SECRET_KEY` | **No** | En ningún lugar del código de la aplicación. Sólo para tareas administrativas fuera de la web |

La clave secreta no se lee desde `src/` ni desde `app/`, y no tiene prefijo `NEXT_PUBLIC_`. Eso lo
verifica `npm run check:secrets`, que hace tres cosas:

1. Rechaza nombres con forma de secreto que lleven prefijo `NEXT_PUBLIC_`.
2. Rechaza que un módulo `"use client"` lea una variable de entorno sin ese prefijo.
3. **Busca el valor de `SUPABASE_SECRET_KEY`, la cadena `sb_secret_` y `"service_role"` dentro de los
   archivos de `.next/static`**, o sea el JavaScript que se le sirve al navegador.

El punto 3 es el que importa, y por eso el script corre **después** del `build` en CI. Sin build previo
avisa que omite esa revisión y sale en verde: la comprobación más importante quedaría desactivada sin
que nadie se entere.

`.gitignore` ignora `.env*` y hace una sola excepción con `!.env.example`. Ningún secreto se imprime en
los logs de CI: los workflows los pasan por `env:` a un comando que los lee del entorno, nunca dentro
de un `echo` ni de una URL. La rotación está en
[`docs/deployment.md`](./deployment.md#rotación).

---

## 8. Logs

`src/infrastructure/logging/logger.ts` emite JSON estructurado y **redacta por lista de claves antes de
escribir**. La lista, tal como está en el código: `token`, `accesstoken`, `refreshtoken`, `idtoken`,
`authorization`, `cookie`, `setcookie`, `password`, `secret`, `apikey`, `key`, `clave`, `email`,
`phone`, `telefono`, `dni`, `cbu`, `cvu`, `alias`, `iban`, `accountnumber`, `routingnumber`, `rut`,
`contributorname`, `contributordisplayname`, `sourcenote`.

Las claves se normalizan antes de comparar —minúsculas, sin guiones ni espacios— así que
`Access-Token`, `access_token` y `accessToken` se redactan las tres. Recorre objetos, arrays y errores,
y las referencias circulares se emiten como `"[circular]"` en lugar de colgar el proceso.

`info` y `debug` no se emiten en producción. `warn` y `error` sí, y son las únicas dos funciones de
consola que ESLint permite en todo el repositorio.

Un ejemplo de la disciplina que esto exige: el intento de acceso fallido registra `{ code: error.code }`
y **no** el correo que se intentó. El logger lo redactaría igual, pero el dato que sirve para
diagnosticar es el código.

Los mensajes al usuario y los mensajes al log son distintos a propósito (amenaza I6): el log lleva el
error completo, y la pantalla dice `"No se pudo <hacer tal cosa>. El detalle quedó en el registro del
servidor."`

---

## 9. La API pública y los agentes

Las cinco capacidades son de **sólo lectura** y ninguna mueve dinero (FR-030, amenaza A1). El detalle
está en [`docs/webmcp.md`](./webmcp.md); lo que corresponde a este documento:

- **Límite de tasa por IP** en `/api/public/*`: ventana fija de 60 pedidos por minuto, en memoria
  (`src/infrastructure/http/rate-limit.ts`). La clave sale de `x-forwarded-for` y, si no está, de
  `x-real-ip`. Es **por instancia**, así que el límite efectivo se multiplica por la cantidad de
  instancias serverless. Está declarado como riesgo aceptado: alcanza contra el abuso torpe, no contra
  un ataque distribuido, y para eso está la protección del borde de Vercel.
- **Las descripciones de las herramientas son literales y afirmativas**, sin instrucciones al modelo y
  sin interpolar contenido externo (amenaza A3, *tool poisoning*). Hay un test que lo verifica.
- **Ninguna capacidad devuelve contenido escrito por terceros**, así que no hay vector de prompt
  injection por el contenido devuelto (amenaza A2).
- **La ruta REST y la interfaz ejecutan el mismo caso de uso**, y hay 21 tests de equivalencia que lo
  comprueban (amenaza A5).
- `/api/health` dice de qué **clase** es la fuente de datos, no cuál: ni URL, ni claves, ni nombres de
  tablas (amenaza I6).

---

## 10. Lo que está aceptado como riesgo

Se declara en lugar de disimularse. La lista vive en el modelo de amenazas §5 y se repite acá porque es
lo primero que hay que revisar cuando el contexto cambie:

| Riesgo | Por qué se acepta | Cuándo se revisa |
| --- | --- | --- |
| `style-src 'unsafe-inline'` | Next inyecta estilos en línea | Si aparece soporte estable de nonce para estilos |
| `script-src 'unsafe-inline'` | Con nonces el HTML público deja de ser cacheable | Si Next emite nonces compatibles con respuestas cacheadas |
| El claim de rol se refresca al rotar el token | Un cambio de rol tarda hasta el próximo refresh | Si el equipo crece |
| Fidelidad parcial del shim local | Falta GoTrue y Realtime | `db push --dry-run` y `db advisors --linked` como compuerta real |
| La mutación y su entrada de auditoría no son atómicas | Son dos viajes a la base. Si el segundo falla, el cambio queda sin rastro y la pantalla informa el error, no lo esconde. Cerrar la ventana pediría una función SQL por operación, o sea el dominio duplicado en PL/pgSQL ([ADR-019](./adr/019-auditoria-por-funcion.md)) | Si el rastro pasa a ser un requisito legal y no operativo |
| Sin límite de tasa en el borde | Vercel provee protección básica | Si aparece abuso real |
| Sin 2FA obligatorio en las cuentas de administración | Depende del proveedor de identidad, no del código | Antes de dar acceso a más personas |
| Un sitio clonado que copie el diseño y cambie el CBU | Está fuera del control técnico | Se mitiga por producto: dominio único comunicado en todos los canales, y los datos bancarios publicados también fuera del sitio |

El último es el que más importa y el que menos se puede resolver con código, y por eso vale escribirlo
acá: la defensa contra un clon es que la gente sepa cuál es el dominio verdadero.

---

## 11. Si algo pasa

| Situación | Primero |
| --- | --- |
| Un secreto quedó expuesto | Revocarlo en el proveedor **antes** de crear el reemplazo. Un token revocado rompe el despliegue, que es un problema mucho más chico que un token vivo en manos ajenas |
| Un dato bancario publicado está mal | Despublicar el método desde `/admin/cuentas` (no editarlo: despublicarlo). Después corregir y volver a publicar. Todo el cambio queda en `audit_log` |
| Se sospecha un acceso indebido | `/admin/auditoria` tiene el rastro con actor, acción, entidad y diff. Después, rotar la contraseña de la cuenta y revisar `user_roles` |
| Una cifra publicada es incorrecta | Nada financiero se borra: se anula con motivo. La anulación también se audita |
| Aparece una vulnerabilidad en una dependencia | Dependabot abre el pull request; `npm audit` en CI corta el merge si es crítica |

Los pasos completos, con comandos, están en [`docs/runbook.md`](./runbook.md).
