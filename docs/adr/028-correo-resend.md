# ADR-028 · Los correos de identidad salen por SMTP de Resend; los del producto, por un puerto propio

**Estado**: Aceptada · **Fecha**: 2026-09-13

## Contexto

Esta feature necesita seis correos, y no son todos la misma cosa:

| Correo | Quién lo genera |
|---|---|
| Confirmación de cuenta | El servidor de Auth: contiene un token que sólo él sabe emitir |
| Recuperación de contraseña | El servidor de Auth, ídem |
| Cambio de dirección de correo | El servidor de Auth, ídem |
| Confirmación de reserva | La aplicación |
| Recordatorio de vencimiento | La aplicación |
| Agradecimiento y aviso al equipo | La aplicación |

Los tres primeros no se pueden mandar desde la aplicación: el enlace lleva un token firmado que lo
genera GoTrue en el momento de la operación. La aplicación no lo tiene y no debería tenerlo.

Hay además un detalle operativo que decide más de lo que parece: el servicio de correo incluido en
Supabase está limitado a **dos correos por hora** por defecto y su documentación dice explícitamente
que no es para producción. Con eso, dos personas registrándose el mismo día ya rompen el flujo.

## Decisión

**Dos caminos, uno por cada clase de correo.**

1. **Identidad → SMTP.** Se configura el SMTP propio de Supabase Auth apuntando a Resend:
   `smtp.resend.com`, puerto `587` (STARTTLS), usuario `resend`, contraseña = la API key. Los datos
   están verificados contra la documentación oficial de Resend y las claves de configuración contra
   la referencia del CLI de Supabase (`auth.email.smtp.*`, `auth.email.enable_confirmations`,
   `auth.rate_limit.email_sent`), no contra la memoria de nadie.
2. **Producto → puerto `EmailSender`.** Un puerto en `src/domain/ports/email.ts` y un adaptador en
   `src/infrastructure/email/resend-sender.ts` que hace `POST https://api.resend.com/emails` con
   `Authorization: Bearer` y el header `Idempotency-Key`.

**Sin el paquete `resend` de npm.** El adaptador es un `fetch` con un objeto JSON de seis campos. La
constitución pide que una dependencia se justifique contra escribir el código (principio III), y acá
el código son cuarenta líneas contra una dependencia más en el árbol, con su versión exacta que
mantener y su superficie de suministro. El SDK aportaría tipos que el puerto ya define y un helper de
React que este proyecto no va a usar, porque los correos son de texto con formato mínimo.

**El correo nunca está en el camino crítico.** La reserva se confirma en su propia transacción; el
correo se intenta después. Si falla, la reserva **ya está hecha** y la pantalla muestra los datos de
entrega en lugar de prometer un correo que no llegó (FR-233, FR-234).

**Sin credencial, hay degradación explícita, no silencio.** Si falta `RESEND_API_KEY`, el puerto se
resuelve a una implementación que registra y no manda, igual que `getPublicDataLayer()` resuelve a
`content-only` sin Supabase. Lo que no se hace es ofrecer un flujo que no se pueda completar.

Cada intento de envío deja fila en `public.email_deliveries`, y la escribe una función
`security definer` que **resuelve la dirección de destino por dentro** en lugar de aceptarla por
parámetro: así una cuenta del público no puede usar el registro de envíos para anotar ni para
descubrir la dirección de otra persona.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Mandar los correos de identidad desde la aplicación | Imposible sin el token firmado que genera GoTrue. Habría que replicar el flujo de confirmación a mano, que es escribir autenticación propia por la puerta de atrás |
| Usar el servicio de correo incluido de Supabase | Dos correos por hora y remitente de un dominio ajeno. La documentación oficial dice que no es para producción |
| El SDK `resend` de npm | Envuelve un `POST`. Suma una dependencia y no resuelve nada que el puerto no resuelva |
| `react-email` para las plantillas | Un motor de plantillas en React para seis correos de texto. Los correos de este proyecto no tienen imágenes ni columnas: tienen párrafos |
| Resend también para los correos de identidad, por API en vez de SMTP | No hay dónde enchufarlo: Auth manda por SMTP o por su servicio, no por un webhook de envío arbitrario en esta versión |
| Mandar el correo dentro de la transacción de la reserva | Una caída del proveedor pasaría a ser una caída de la reserva. Se invierte la prioridad: la donación importa más que el acuse |
| Encolar en una tabla y procesar con un worker | Es la respuesta correcta con volumen. Con las decenas de correos que va a mover este sitio, es infraestructura para un problema que no existe |

## Consecuencias

**Buenas.** Los dos caminos salen del mismo dominio verificado, así que quien recibe ve siempre el
mismo remitente. El puerto deja el proveedor reemplazable: cambiar Resend por otro es un archivo. El
`Idempotency-Key` hace que un reintento del recordatorio no mande dos correos, que es la única forma
razonable de cumplir FR-235 sin inventar un registro de deduplicación propio.

**Malas y aceptadas.**

- **Nada sale hasta que alguien verifique el dominio** en Resend y cargue SPF, DKIM y DMARC. Es
  trabajo humano, previo y fuera del repositorio; queda como paso bloqueante en el runbook, con la
  nota de que hasta entonces sólo se puede probar contra la dirección de prueba del proveedor.
- **La API key vale para los dos caminos.** La misma clave está en el entorno de la aplicación y en
  la configuración de Auth del proyecto, así que rotarla son dos lugares. Está en el runbook.
- La plantilla de los correos de identidad se edita **en el panel de Supabase**, no en el
  repositorio, así que esos tres textos quedan fuera del control de versiones y fuera de
  `check:placeholders`. Se compensa dejando su texto en `docs/runbook.md` para poder reponerlo, y es
  la razón por la que los otros tres sí viven en `content/`.
- Un fallo de envío es visible en el backoffice, no en la pantalla de quien lo esperaba minutos
  después. Alguien tiene que mirar. Es el precio de no meter el correo en la transacción.
