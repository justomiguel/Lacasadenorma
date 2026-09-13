import { z } from "zod";

import { perform, type AdminDeps, type AdminResult } from "@/src/application/admin/core";
import type { EmailSender } from "@/src/domain/ports/email";
import { buildAccountEmail } from "@/src/application/emails/messages";
import { localizeHref } from "@/src/i18n/locale";

const inputSchema = z.object({
  userId: z.string().uuid(),
  decision: z.enum(["approved", "declined"]),
  locale: z.enum(["es", "en"]),
  note: z.string().max(500).optional(),
});

export interface ReviewAccountMail {
  readonly sender: EmailSender;
  readonly siteUrl: string;
  readonly record: (input: {
    kind: "account.approved" | "account.declined";
    userId: string;
    result: Awaited<ReturnType<EmailSender["send"]>>;
  }) => Promise<void>;
  readonly contactOf: (userId: string) => Promise<string | null>;
}

/**
 * Habilitar o rechazar una cuenta del público.
 *
 * El correo se intenta **después** de la decisión. Si no sale, la decisión ya
 * está tomada y el backoffice lo ve en `email_deliveries` (ADR-033, FR-233).
 */
export async function reviewDonorAccount(
  deps: AdminDeps,
  input: unknown,
  mail: ReviewAccountMail | null,
): Promise<AdminResult<{ decision: "approved" | "declined" }>> {
  const result = await perform({
    deps,
    permission: "donaciones.escribir",
    describe: "revisar la cuenta",
    schema: inputSchema,
    input,
    run: async (parsed) => {
      await deps.gateway.donors.reviewAccount({
        userId: parsed.userId,
        decision: parsed.decision,
        note: parsed.note?.trim() ? parsed.note.trim() : null,
      });

      return parsed;
    },
    success: (output) =>
      output.decision === "approved" ? "Cuenta habilitada." : "Cuenta rechazada.",
    audit: (parsed) => ({
      action: parsed.decision === "approved" ? "donor.approved" : "donor.declined",
      entityTable: "donor_profiles",
      entityId: parsed.userId,
      diff: parsed.note?.trim() ? { note: true } : null,
    }),
  });

  if (result.status !== "ok" || mail === null) {
    return result.status === "ok"
      ? {
          status: "ok",
          value: { decision: result.value.decision },
          message: result.message,
        }
      : result;
  }

  try {
    const locale = result.value.locale;
    const recipient = await mail.contactOf(result.value.userId);

    if (recipient !== null) {
      const kind =
        result.value.decision === "approved" ? "account.approved" : "account.declined";
      const message = buildAccountEmail(kind, {
        userId: result.value.userId,
        recipient,
        locale,
        accountUrl: `${mail.siteUrl}${localizeHref("/cuenta", locale)}`,
      });
      const sent = await mail.sender.send(kind, message);

      await mail.record({ kind, userId: result.value.userId, result: sent });
    }
  } catch (error) {
    deps.logger.error("No se pudo avisar la decisión sobre la cuenta", { error });
  }

  return {
    status: "ok",
    value: { decision: result.value.decision },
    message: result.message,
  };
}
