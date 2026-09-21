# Contrato — Los correos

Dos caminos distintos por una razón que no es de gusto: los tres de identidad llevan un token que
sólo GoTrue puede emitir. El transporte, a partir de la enmienda de 2026-09-16, es el mismo puerto
`EmailSender` que el resto ([ADR-028](../../../docs/adr/028-correo-resend.md),
[ADR-033](../../../docs/adr/033-aprobacion-de-cuentas.md)).

| Correo | Camino | Disparador | Plantilla |
|---|---|---|---|
| Confirmación de cuenta | API de Resend | `signUp` / hook `send_email` | `content/*/emails.json` |
| Recuperación de contraseña | API de Resend (hook) o SMTP | `requestPasswordReset` | `content/*/emails.json` o panel |
| Cambio de dirección | API de Resend (hook) o SMTP | Cambio de correo | `content/*/emails.json` o panel |
| Pedido de cuenta recibido | API de Resend | Perfil creado en `/cuenta` | `content/*/emails.json` |
| Cuenta habilitada | API de Resend | `review_donor_account('approved')` | `content/*/emails.json` |
| Cuenta rechazada | API de Resend | `review_donor_account('declined')` | `content/*/emails.json` |
| Reserva confirmada | API de Resend | `claim_donation_item` exitosa | `content/*/emails.json` |
| Recordatorio de vencimiento | API de Resend | Proceso diario, 3 días antes | `content/*/emails.json` |
| Donación recibida | API de Resend | `fulfill_donation_pledge` | `content/*/emails.json` |
| Confirmación deshecha | API de Resend | `revert_donation_pledge` | `content/*/emails.json` |
| Aviso al equipo: cuenta nueva | API de Resend | Perfil creado en `/cuenta` | `content/*/emails.json` |
| Aviso al equipo: reserva nueva | API de Resend | `claim_donation_item` o `offer_donation_item` exitosa | `content/*/emails.json` |
| Aviso al equipo: pedido por teléfono | API de Resend | `offer_donation_item` exitosa | `content/*/emails.json` |
| Aviso al equipo: cancelación | API de Resend | `cancel_donation_pledge` | `content/*/emails.json` |
| Aviso al equipo: plazo cumplido | API de Resend | Cron `remind-pledges.mjs`, 14 días sin confirmar | `content/*/emails.json` |

Los avisos al equipo viajan en el mismo disparador que el correo a la persona, con destinatario
distinto. El cuerpo **no lleva el correo** de terceros: se lee en el backoffice, con sesión.
`staff.new_pledge` nombra a quien reservó con el nombre de la cuenta; si la cuenta no tiene
nombre, dice «Alguien». `staff.phone_offer` nombra a quien avisó y lleva un botón de WhatsApp al
número que dejó: es el motivo de ese camino (ADR-051, FR-237). El resto de los avisos al equipo
no lleva teléfono.

Qué **no** manda correo, y el motivo: está en ADR-033. Cambiar el perfil y fallar un envío no
duplican aviso. Los tres de identidad ahora sí pasan por este puerto: el token lo emite GoTrue, el
HTML lo arma la aplicación, Resend lo manda.

## El puerto

```ts
// src/domain/ports/email.ts — TypeScript puro, sin fetch, sin Next
export type EmailKind =
  | "account.confirm"
  | "account.recover"
  | "account.email_change"
  | "account.received"
  | "account.approved"
  | "account.declined"
  | "pledge.confirmed"
  | "pledge.reminder"
  | "pledge.fulfilled"
  | "pledge.reverted"
  | "staff.new_account"
  | "staff.new_pledge"
  | "staff.phone_offer"
  | "staff.pledge_cancelled"
  | "staff.pledge_expired";
```

`EmailResult` es un tipo discriminado y no una excepción: un envío que falla **no es excepcional**,
es uno de los tres resultados normales (`sent | failed | skipped`), y el tipo obliga a quien llama a
decidir qué hacer con cada uno. `skipped` existe para que "no hay credencial" no se confunda con
"el proveedor rechazó el correo".

Dos implementaciones desde el primer día:

- `ResendSender` — `POST https://api.resend.com/emails`, `Authorization: Bearer`,
  `Idempotency-Key`. Manda `text` **y** `html`. Sin el paquete `resend`.
- `LoggingSender` — sin `RESEND_API_KEY` o sin remitente: registra con nivel `warn` y devuelve
  `skipped`. La dirección del equipo **no** decide esto: sin ella, el aviso al staff no sale y el
  correo a la persona sí.

`getEmailSender()` elige, igual que `getPublicDataLayer()` elige entre Supabase y `content-only`.

## Idempotencia, en dos capas porque una no alcanza

| Capa | Alcance | Para qué |
|---|---|---|
| `Idempotency-Key` de Resend | **24 horas** | Que un reintento inmediato no mande dos veces |
| `email_deliveries` | Para siempre | Que el mismo correo no se anote dos veces como enviado |

La clave se arma como `<kind>/<subject_id>`. El sujeto es la reserva o la cuenta, según la clase, y
no contiene nada personal. Sobre `email_deliveries` hay dos índices únicos parciales (`status =
'sent'`): `(kind, pledge_id)` y `(kind, about_user_id)`.

## Contenido

Cada correo vive en `content/es/emails.json` y `content/en/emails.json`, validado con Zod al
importar. Los cuatro del equipo están **idénticos y en castellano** en los dos archivos: el
backoffice no se traduce (ADR-014). `content/emails.test.ts` compara los dos y falla si alguien
traduce ésos.

Reglas del cuerpo:

- **Plantilla HTML propia**, vestida con la paleta del sitio (bosque `#153A2E`, papel `#F6F1E8`,
  sage). La arma `src/application/emails/layout.ts`. No es un párrafo suelto ni un newsletter.
- **Una tabla de maquetación anidada** (outer 100% + inner 600 px), `role="presentation"`. Ninguna
  tabla de cuerpo. Lo afirma `messages.test.ts` contando exactamente dos `<table`.
- **Sin imágenes remotas y sin pixel de seguimiento.** Georgia y Arial, que ya están en el aparato.
  Es ADR-010 aplicado al correo.
- **Sin correo ni teléfono** de terceros en los avisos al equipo, salvo `staff.phone_offer`
  (ADR-051): el nombre, y el número como botón `wa.me`. `staff.new_pledge` sí lleva el nombre
  de la cuenta. Sin logo: el correo no lleva imágenes remotas.
- El cuerpo de texto se escribe a mano, no se genera desde el HTML.
- Sin enlaces que autentiquen. El correo lleva a `/cuenta` o a `/admin`, y ahí se pide sesión
  (FR-237). Los dos enlaces de sí/no de una reserva nueva van a
  `/admin/donaciones/decidir/{id}/si` y `/no`; mutan con un POST, no con el GET.

## Qué ve la persona cuando el correo no sale

La operación **ya está hecha** (FR-233): la cuenta nació, la habilitación quedó, la reserva está.
La pantalla no promete un correo que no llegó. El fallo queda en `email_deliveries` con su causa y
sin secretos, visible en el backoffice.

Lo que **no** se hace: reintentar en un bucle, ni revertir la operación, ni mandar un correo para
decir que no se pudo mandar un correo.

## Antes del primer envío

Bloqueante y humano, en `docs/runbook.md`: verificar el dominio en Resend y cargar SPF, DKIM y
DMARC. Hasta que eso esté, sólo se puede probar contra la dirección de prueba del proveedor. La
misma clave sirve para el SMTP de Auth y para la API, así que rotarla son **dos** lugares. El texto
de los tres correos de identidad —que se editan en el panel, no en el repositorio— está copiado ahí
para poder reponerlo.
