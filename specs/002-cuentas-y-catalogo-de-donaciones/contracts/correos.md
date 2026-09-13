# Contrato — Los seis correos

Dos caminos distintos por una razón que no es de gusto: los tres primeros llevan un token que sólo
GoTrue puede emitir, así que salen por SMTP; los otros tres los arma la aplicación
([ADR-028](../../../docs/adr/028-correo-resend.md)).

| Correo | Camino | Disparador | Plantilla |
|---|---|---|---|
| Confirmación de cuenta | SMTP de Resend | `signUp` | Panel de Supabase |
| Recuperación de contraseña | SMTP de Resend | `requestPasswordReset` | Panel de Supabase |
| Cambio de dirección | SMTP de Resend | Cambio de correo | Panel de Supabase |
| Reserva confirmada | API de Resend | `claim_donation_item` exitosa | `content/*/emails.json` |
| Recordatorio de vencimiento | API de Resend | Proceso diario, 3 días antes | `content/*/emails.json` |
| Donación recibida | API de Resend | `fulfill_donation_pledge` | `content/*/emails.json` |
| Aviso al equipo | API de Resend | `claim_donation_item` exitosa | `content/*/emails.json` |

Son seis clases y siete filas porque el aviso al equipo viaja junto con la confirmación de la reserva,
en el mismo disparador y con destinatario distinto.

## El puerto

```ts
// src/domain/ports/email.ts — TypeScript puro, sin fetch, sin Next
export type EmailKind =
  | "pledge.confirmed"
  | "pledge.reminder"
  | "pledge.fulfilled"
  | "staff.new_pledge";

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  /** Misma clave = mismo correo. Resend descarta el duplicado por 24 horas. */
  readonly idempotencyKey: string;
}

export type EmailResult =
  | { readonly status: "sent"; readonly providerId: string }
  | { readonly status: "failed"; readonly error: string }
  | { readonly status: "skipped"; readonly reason: "not-configured" };

export interface EmailSender {
  send(kind: EmailKind, message: EmailMessage): Promise<EmailResult>;
}
```

`EmailResult` es un tipo discriminado y no una excepción: un envío que falla **no es excepcional**, es
uno de los tres resultados normales, y el tipo obliga a quien llama a decidir qué hacer con cada uno.
`skipped` existe para que "no hay credencial" no se confunda con "el proveedor rechazó el correo": la
primera es una decisión de despliegue y la segunda es un problema.

Dos implementaciones desde el primer día:

- `ResendSender` — `POST https://api.resend.com/emails`, `Authorization: Bearer`,
  `Idempotency-Key`. Manda `text` **y** `html`.
- `LoggingSender` — sin `RESEND_API_KEY`: registra con nivel `warn` y devuelve `skipped`.

`getEmailSender()` elige, igual que `getPublicDataLayer()` elige entre Supabase y `content-only`.

## Idempotencia, en dos capas porque una no alcanza

| Capa | Alcance | Para qué |
|---|---|---|
| `Idempotency-Key` de Resend | **24 horas** | Que un reintento inmediato no mande dos veces |
| `email_deliveries` + `pledges.reminded_at` | Para siempre | Que el recordatorio salga una sola vez en la vida de la reserva (FR-235, SC-210) |

La clave se arma como `<kind>/<pledge_id>`, que es estable y no contiene nada personal. La segunda
capa existe porque la primera expira: el proceso de recordatorios corre todos los días, y a las 25
horas la clave ya no lo frenaría. Antes de mandar, el proceso descarta las reservas que ya tienen
`reminded_at`.

## Contenido

Cada correo vive en `content/es/emails.json` y `content/en/emails.json`, validado con Zod al importar
como el resto del contenido, con: asunto, cuerpo en párrafos, etiqueta de la acción, y la frase que
explica por qué la persona recibe esto.

Reglas del cuerpo:

- **Sin imágenes remotas y sin pixel de seguimiento.** Es la misma decisión de ADR-010 aplicada al
  correo: no se mide si alguien abrió nada.
- **Sin datos de terceros.** El aviso al equipo dice qué se reservó y que hay una reserva nueva; el
  nombre de quien reservó lo leen en el backoffice, con su sesión, y no en una bandeja de entrada.
- El cuerpo de texto se escribe a mano, no se genera desde el HTML: es el que van a leer los clientes
  que bloquean formato.
- El `html` es semántico y mínimo. Sin tablas de maquetación: los cuatro correos son párrafos, un
  dato y un enlace.
- Sin enlaces que autentiquen. El correo lleva a `/cuenta`, y ahí se pide sesión (FR-237).

## Qué ve la persona cuando el correo no sale

La reserva **ya está hecha** (FR-233), así que la pantalla no puede decir "te mandamos un correo".
Muestra los datos de la reserva y cómo entregar, y agrega que el correo no pudo salir. El fallo queda
en `email_deliveries` con su causa y sin secretos, visible en el backoffice.

Lo que **no** se hace: reintentar en un bucle, ni revertir la reserva, ni mostrar un error genérico que
haga dudar de si la reserva quedó.

## Antes del primer envío

Bloqueante y humano, en `docs/runbook.md`: verificar el dominio en Resend y cargar SPF, DKIM y DMARC.
Hasta que eso esté, sólo se puede probar contra la dirección de prueba del proveedor. La misma clave
sirve para el SMTP de Auth y para la API, así que rotarla son **dos** lugares.
