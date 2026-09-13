import { z } from "zod";

import { paragraphs, phrase } from "./primitives";

/**
 * El texto de los cuatro correos que arma la aplicación (ADR-028).
 *
 * Los otros tres —confirmar la cuenta, recuperar la contraseña, cambiar de
 * dirección— **no están acá y no pueden estar**: los manda el servidor de Auth
 * porque llevan un token firmado, y su plantilla se edita en el panel de Supabase.
 * Su texto queda copiado en `docs/runbook.md` para poder reponerlo, que es lo
 * único que se puede hacer con una plantilla que vive fuera del repositorio.
 *
 * **Las marcas de sustitución son tres y están cerradas**: `{what}` es lo que se
 * reservó, `{when}` es cuándo vence y `{link}` es a dónde ir. No hay motor de
 * plantillas: es un reemplazo de tres cadenas, y `messages.test.ts` falla si algún
 * correo sale con una marca sin reemplazar. Un `{what}` que llega a una bandeja de
 * entrada no lo detecta nadie más.
 */

const message = z.object({
  subject: phrase,
  /** Párrafos. Cada uno es un `<p>` en el html y un bloque en el texto plano. */
  body: paragraphs,
  /** El texto del enlace. Lleva a `/cuenta` o a `/admin`, nunca autentica. */
  action: phrase,
  /**
   * Por qué esta persona está recibiendo esto. Va al pie de los cuatro.
   *
   * No es cortesía: un correo transaccional que no explica de dónde salió se
   * parece a uno que no se pidió, y quien lo recibe lo marca como spam, que le
   * cuesta la reputación al dominio entero.
   */
  why: phrase,
});

export const emailsSchema = z.object({
  pledgeConfirmed: message,
  pledgeReminder: message,
  pledgeFulfilled: message,
  /**
   * El aviso al equipo. Está en los dos archivos y en los dos dice lo mismo, en
   * castellano, porque el backoffice no se traduce (ADR-014) y quien lo recibe
   * entra a `/admin`. `content/emails.test.ts` compara los dos y falla si alguien
   * traduce éste: la copia idéntica es la decisión, no un olvido.
   */
  staffNewPledge: message,
});

export type EmailsContent = z.infer<typeof emailsSchema>;
