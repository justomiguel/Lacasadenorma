import { z } from "zod";

import { paragraphs, phrase } from "./primitives";

/**
 * El texto de los correos que arma la aplicación (ADR-028, ADR-033).
 *
 * Los tres de identidad —confirmar la cuenta, recuperar la contraseña, cambiar de
 * dirección— **no están acá y no pueden estar**: los manda el servidor de Auth
 * porque llevan un token firmado, y su plantilla se edita en el panel de Supabase.
 *
 * **Las marcas de sustitución son tres y están cerradas**: `{what}` es lo que se
 * reservó, `{when}` es cuándo vence y `{link}` es a dónde ir. No hay motor de
 * plantillas. `messages.test.ts` falla si algún correo sale con una marca sin
 * reemplazar.
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
  pledgeConfirmed: message,
  pledgeReminder: message,
  pledgeFulfilled: message,
  /**
   * Los cuatro del equipo. Están en los dos archivos y en los dos dicen lo mismo,
   * en castellano, porque el backoffice no se traduce (ADR-014).
   * `content/emails.test.ts` compara los dos y falla si alguien traduce éstos.
   */
  staffNewAccount: message,
  staffNewPledge: message,
  staffPledgeCancelled: message,
  staffPledgeExpired: message,
});

export type EmailsContent = z.infer<typeof emailsSchema>;
export type EmailCopy = EmailsContent[keyof EmailsContent];
