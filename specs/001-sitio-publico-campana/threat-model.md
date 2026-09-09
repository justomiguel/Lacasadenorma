# Fase 1 — Modelo de amenazas

Alcance: el sitio público, el backoffice, la base de datos, el almacenamiento de archivos y las
capacidades expuestas a agentes.

Antes de la tabla, la pregunta que ordena todo: **¿qué es lo peor que puede pasar?**

No es que el sitio se caiga. Es que **alguien transfiera dinero a una cuenta que no es de la
familia**. Todo lo demás es menos grave. Esa jerarquía define dónde se pone el esfuerzo: el control
de `payment_methods` es la superficie más protegida del sistema, por encima de cualquier otra.

Segundo peor caso: que se publique un comprobante con datos de un tercero, o que se filtre la
identidad de quien aportó.

---

## 1. Activos y actores

| Activo | Por qué importa |
|---|---|
| Datos de las cuentas de aporte | Si se alteran, el dinero va a otra parte |
| Credenciales de administración | Dan acceso a lo anterior |
| Comprobantes | Pueden contener datos de terceros |
| Identidad de quienes aportan | Dato personal que no se publica |
| Integridad de las cifras | Es el argumento de confianza del proyecto |
| Reputación del proyecto | Un incidente visible cancela la campaña |

| Actor | Capacidad |
|---|---|
| Visitante anónimo | Lectura de lo publicado |
| `editor` | Publica contenido; no ve ni toca plata |
| `admin` | Registra aportes y gastos |
| `owner` | Todo, incluidas las cuentas de aporte |
| `auditor` | Lectura total, incluidos comprobantes; cero escritura |
| Atacante externo | Sin credenciales |
| Atacante con credenciales robadas | Phishing a quien administra |
| Agente de IA | Actúa en nombre de una persona, con su sesión |

---

## 2. Amenazas y mitigaciones

Clasificadas por STRIDE. "Verificación" indica cómo se comprueba que la mitigación existe, porque
una mitigación sin verificación es una intención.

### Spoofing (suplantación)

| # | Amenaza | Mitigación | Verificación |
|---|---|---|---|
| S1 | Alguien accede al backoffice sin ser quien dice | Supabase Auth; `getClaims()` verifica la firma del JWT localmente, no `getSession()` que sólo lee storage local | E2E: acceso sin sesión redirige |
| S2 | Un sitio clonado copia el diseño y cambia el CBU | Fuera del control técnico. Mitigación de producto: dominio único comunicado en todos los canales, y los datos bancarios publicados también fuera del sitio | Documentado en el runbook |
| S3 | Se falsifica el rol en el token | El rol se lee de `app_metadata`, que sólo el servidor de auth puede escribir. **Nunca** de `user_metadata`, que es editable por el usuario | pgTAP: un claim de rol en `user_metadata` no otorga acceso |

### Tampering (manipulación)

| # | Amenaza | Mitigación | Verificación |
|---|---|---|---|
| T1 | **Se modifican los datos de una cuenta de aporte** | Sólo el rol `owner` puede escribir en `payment_methods`; todo cambio queda en `audit_log`; publicar requiere validación de esquema | pgTAP: `admin` y `editor` reciben negación en `insert`/`update`/`delete` |
| T2 | Se alteran cifras para ocultar un gasto | Los registros financieros no se borran: se anulan con motivo, y la anulación se audita. `audit_log` no tiene policies de `UPDATE` ni `DELETE` para ningún rol | pgTAP: `delete` sobre `audit_log` falla incluso para `owner` |
| T3 | Inyección SQL | Sin SQL construido por concatenación; todo pasa por el cliente de Supabase con parámetros; las funciones SQL propias son `stable`/`sql` con argumentos tipados | Revisión de código; ausencia de SQL dinámico |
| T4 | XSS por contenido de administración | React escapa por defecto; el cuerpo de las novedades se renderiza desde Markdown restringido, **sin HTML crudo**; sin `dangerouslySetInnerHTML` | Test unitario del renderizador con entrada `<script>`; regla de ESLint |
| T5 | CSRF en mutaciones del backoffice | Server Actions de Next con cookies `SameSite=Lax`; toda mutación revalida sesión y permisos del lado servidor | E2E: petición sin sesión válida es rechazada |
| T6 | SVG malicioso subido como foto | Se rechaza `image/svg+xml` en la carga; sólo JPEG, PNG, WebP y AVIF; el tipo se valida por contenido, no por extensión ni por el `Content-Type` que declara el cliente | Test de integración con un SVG renombrado a `.png` |
| T7 | Se sortea `proxy.ts` para llegar a `/admin` | `proxy.ts` **no es** frontera de seguridad (CVE-2025-29927): sólo redirige. Cada página y cada acción de `/admin` revalida por su cuenta | Test que llama una acción de servidor sin sesión |

### Repudiation (no repudio)

| # | Amenaza | Mitigación | Verificación |
|---|---|---|---|
| R1 | No se puede saber quién cambió una cifra | `audit_log` append-only con actor, acción, entidad y diff. Los registros financieros guardan `recorded_by` | pgTAP: registrar un gasto escribe en `audit_log` |

### Information disclosure (divulgación)

| # | Amenaza | Mitigación | Verificación |
|---|---|---|---|
| I1 | **Se filtra un comprobante** | Bucket privado; ninguna policy de lectura para `anon`; acceso sólo por URL firmada de corta duración para `auditor`+ | pgTAP: `anon` no lee `expense_receipts`; test de que la ruta de archivo no es pública |
| I2 | Se filtran aportes individuales | `contributions` sin lectura para `anon`; lo público es una vista agregada con `security_invoker = true` | pgTAP: `anon` recibe 0 filas en `contributions` y sí lee `campaign_totals` |
| I3 | Una vista expone datos privados | **Las vistas bypasean RLS por defecto.** Toda vista se crea con `security_invoker = true` | pgTAP que recorre `pg_views` y falla si alguna vista carece de la opción |
| I4 | La clave secreta de Supabase llega al navegador | Nunca con prefijo `NEXT_PUBLIC_`; sólo se usa en código de servidor bajo `infrastructure/`; verificación automática en CI | Script en CI que falla si la clave secreta aparece fuera de la lista permitida |
| I5 | Los logs contienen datos sensibles | El logger redacta por lista de claves (token, cookie, authorization, clave, email) antes de emitir | Test unitario del logger con un objeto que contiene un token |
| I6 | Un mensaje de error revela estructura interna | Los errores de servidor se registran completos y al usuario se le muestra un mensaje comprensible sin detalle técnico | Test del manejador de errores |
| I7 | Enumeración de borradores por URL | Los borradores no tienen ruta pública; el `slug` sólo resuelve si `published_at` no es nulo | E2E: un borrador devuelve 404 |

### Denial of service

| # | Amenaza | Mitigación | Verificación |
|---|---|---|---|
| D1 | Difusión viral tumba el sitio | Contenido cacheado en el borde; el HTML de las páginas públicas no depende de una consulta por visita | Prueba de carga básica en la verificación |
| D2 | Abuso de los endpoints públicos de capacidades | Límite de tasa por IP en las rutas de API, respuestas pequeñas y acotadas, sin consultas costosas | Test de integración del límite de tasa |
| D3 | Subida de archivos enormes | Límite de tamaño validado en servidor antes de almacenar | Test de integración |

### Elevation of privilege

| # | Amenaza | Mitigación | Verificación |
|---|---|---|---|
| E1 | `editor` accede a datos financieros | RLS por rol, con `editor` sin lectura de `contributions` ni `expenses` | pgTAP por cada combinación rol × tabla × operación |
| E2 | `auditor` modifica algo | `auditor` no tiene ninguna policy de escritura | pgTAP: `insert`/`update`/`delete` fallan para `auditor` en todas las tablas |
| E3 | Una función `security definer` se vuelve endpoint público | Postgres otorga `EXECUTE` a `PUBLIC` por defecto. Las funciones viven en el esquema `private`, llevan `set search_path = ''`, chequean `auth.uid()` internamente y tienen `revoke execute ... from public, anon, authenticated` | pgTAP: `anon` no puede ejecutar `private.has_min_role` |
| E4 | Un `UPDATE` reasigna la propiedad de una fila | Toda policy de `UPDATE` lleva `USING` **y** `WITH CHECK`. Sin `WITH CHECK`, se puede cambiar el dueño de la fila | pgTAP por cada policy de update |
| E5 | Un `UPDATE` falla en silencio por falta de policy de `SELECT` | En Postgres, un `UPDATE` necesita leer la fila primero: sin policy de `SELECT` devuelve 0 filas sin error | pgTAP verifica filas afectadas, no ausencia de error |

### Amenazas específicas de agentes

| # | Amenaza | Mitigación | Verificación |
|---|---|---|---|
| A1 | Un agente ejecuta una operación financiera | **No existe ninguna capacidad que mueva dinero.** Las cinco son de lectura, con `readOnlyHint: true`. No existe primitiva de confirmación humana en la especificación de WebMCP, así que no se asume ninguna | Test que recorre el registro de capacidades y falla si alguna declara mutación |
| A2 | Prompt injection por el contenido devuelto | Ninguna capacidad devuelve contenido escrito por terceros. Si en el futuro se relaya contenido de usuarios, se marca `untrustedContentHint: true` | Revisión de cada capacidad nueva |
| A3 | Tool poisoning: instrucciones escondidas en la descripción de la herramienta | Las descripciones son literales y afirmativas, sin instrucciones al modelo, y nunca interpolan contenido externo | Test que verifica que las descripciones son constantes |
| A4 | Se confía en el esquema de entrada como frontera de seguridad | Todo input se valida en el servidor con Zod aunque el esquema ya lo declare | Test con entrada inválida directo al endpoint |
| A5 | Divergencia entre el camino de la UI y el del agente | Las dos rutas ejecutan el **mismo** caso de uso. Es la vulnerabilidad que la especificación de WebMCP nombra explícitamente | Test que compara la salida del adaptador REST con la del caso de uso |
| A6 | Fuga de datos privados por una capacidad | Las capacidades leen sólo de las mismas fuentes que la página pública | Test que ejecuta cada capacidad como `anon` y verifica que no aparece ningún campo privado |

---

## 3. Cabeceras y configuración de transporte

| Cabecera | Valor | Motivo |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'`; `img-src 'self' data: https://<proyecto>.supabase.co`; `script-src 'self'` con nonce; `style-src 'self' 'unsafe-inline'`; `frame-ancestors 'none'`; `base-uri 'none'`; `form-action 'self'` | `style-src 'unsafe-inline'` es la única concesión, necesaria por los estilos en línea de Next; se documenta como deuda conocida |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Nada de eso se usa |
| `X-Frame-Options` | `DENY` | Redundante con `frame-ancestors`, para clientes viejos |
| `Origin-Agent-Cluster` | **default (no se envía `?0`)** | Enviar `?0` desactiva WebMCP y debilita la frontera de origen |

`Cache-Control` en rutas autenticadas: `private, no-store`. Los headers de caché que `@supabase/ssr`
entrega en `setAll` **deben** copiarse a la respuesta: si se descartan, un CDN puede cachear un
`Set-Cookie` y servir la sesión de una persona a otra.

---

## 4. Gestión de secretos

- `.env` nunca se commitea; `.env.example` documenta todas las variables sin valores.
- La clave secreta de Supabase y el token de Vercel viven sólo en el entorno del proveedor.
- Ningún secreto se imprime en logs de CI.
- `secret scanning` y Dependabot habilitados en el repositorio.
- Rotación documentada en el runbook, con el orden correcto: crear la nueva, desplegar, revocar la
  vieja.

---

## 5. Riesgos aceptados

Se declaran en lugar de disimularse.

| Riesgo aceptado | Por qué se acepta | Cuándo se revisa |
|---|---|---|
| `style-src 'unsafe-inline'` en la CSP | Next inyecta estilos en línea; eliminarlo requiere una arquitectura de nonces para estilos que hoy no vale su costo | Si aparece soporte estable de nonce para estilos |
| Los claims de rol se refrescan al rotar el token | Un cambio de rol tarda hasta el próximo refresh. Con cuatro administradores es aceptable y está en el runbook | Si el equipo crece |
| Fidelidad parcial del shim local de Postgres | Falta GoTrue, PostgREST y Realtime. Una migración puede pasar local y fallar en el proyecto real, o al revés | `db push --dry-run` antes del primer push, y `db advisors --linked` como compuerta verdadera |
| Sin límite de tasa en el borde | Vercel provee protección básica; un límite propio agregaría estado | Si aparece abuso real |
| Sin 2FA obligatorio en las cuentas de administración | Depende del proveedor de identidad, no del código | Antes de dar acceso a más personas |
