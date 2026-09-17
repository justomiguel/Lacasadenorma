import { z } from "zod";

import { paragraphs, phrase } from "./primitives";

/**
 * El texto de los correos que arma la aplicación (ADR-028, ADR-033).
 *
 * Los tres de identidad —confirmar la cuenta, recuperar la contraseña, cambiar de
 * dirección— **sí están acá**: el token lo emite GoTrue, el HTML lo arma este
 * repositorio y Resend lo manda (ADR-028). `{link}` es el canje, no una visita.
 *
 * **Las marcas de sustitución son cinco y están cerradas**: `{what}` es lo que se
 * reservó, `{when}` es cuándo vence, `{who}` es el nombre de un aviso por
 * teléfono, `{phone}` es el número de ese aviso y `{link}` es a dónde ir. No hay
 * motor de plantillas. `messages.test.ts` falla si algún correo sale con una
 * marca sin reemplazar.
 */

const message = z.object({
  subject: phrase,
  /**
   * Lo que se lee en la bandeja antes de abrir. Si coincide con el asunto, el
   * cliente lo esconde: por eso es una frase distinta, no una copia.
   */
  preheader: phrase,
  /** Párrafos. Cada uno es un `<p>` en el html y un bloque en el texto plano. */
  body: paragraphs,
  /** El texto del enlace. Lleva a `/cuenta` o a `/admin`, nunca autentica. */
  action: phrase,
  /**
   * Por qué esta persona está recibiendo esto. Va al pie de todos.
   *
   * No es cortesía: un correo transaccional que no explica de dónde salió se
   * parece a uno que no se pidió, y quien lo recibe lo marca como spam.
   */
  why: phrase,
});

export const emailsSchema = z.object({
  accountReceived: message,
  accountApproved: message,
  accountDeclined: message,
  /**
   * Los tres de identidad. Llevan un token en `{link}` a propósito: sin abrirlo
   * no hay prueba de que la casilla existe (ADR-028).
   */
  accountConfirm: message,
  accountRecover: message,
  accountEmailChange: message,
  pledgeConfirmed: message,
  pledgeReminder: message,
  pledgeFulfilled: message,
  /**
   * Los cinco del equipo. Están en los dos archivos y en los dos dicen lo mismo,
   * en castellano, porque el backoffice no se traduce (ADR-014).
   * `content/emails.test.ts` compara los dos y falla si alguien traduce éstos.
   */
  staffNewAccount: message,
  staffNewPledge: message.extend({ rejectAction: phrase }),
  staffPhoneOffer: message.extend({ rejectAction: phrase, extraAction: phrase }),
  staffPledgeCancelled: message,
  staffPledgeExpired: message,
});

export type EmailsContent = z.infer<typeof emailsSchema>;
export type EmailCopy = EmailsContent[keyof EmailsContent] & {
  readonly rejectAction?: string;
  readonly extraAction?: string;
};
