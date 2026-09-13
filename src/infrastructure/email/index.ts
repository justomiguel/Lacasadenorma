import type { EmailSender } from "@/src/domain/ports/email";

import { logger } from "../logging/logger";
import { readEmailConfig } from "./config";
import { LoggingSender } from "./logging-sender";
import { ResendSender } from "./resend-sender";

/**
 * Quién manda el correo del producto.
 *
 * Igual que `getPublicDataLayer()`: sin credencial no hay silencio, hay una
 * implementación que registra y no manda. La operación que disparó el correo se
 * completa igual (FR-233, FR-236).
 */
export function getEmailSender(): EmailSender {
  const config = readEmailConfig();

  if (config === null) {
    return new LoggingSender({
      warn: (message, context) => logger.warn(message, context),
    });
  }

  return new ResendSender({ apiKey: config.apiKey, from: config.from });
}

export { readEmailConfig, readStaffAddress } from "./config";
export { LoggingSender } from "./logging-sender";
export { ResendSender } from "./resend-sender";
