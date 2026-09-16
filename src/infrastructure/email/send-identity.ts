import {
  buildIdentityEmail,
  type IdentityFacts,
} from "@/src/application/emails/identity";
import type { EmailResult, IdentityEmailKind } from "@/src/domain/ports/email";

import { getEmailSender } from "./index";

/**
 * Manda un correo de identidad por el mismo puerto que el resto (Resend).
 *
 * No anota `email_deliveries`: esa función pide sesión, y al confirmar todavía
 * no hay. El fallo se ve en el log y en la consola de Resend.
 */
export async function sendIdentityMail(
  kind: IdentityEmailKind,
  facts: IdentityFacts,
): Promise<EmailResult> {
  return getEmailSender().send(kind, buildIdentityEmail(kind, facts));
}
