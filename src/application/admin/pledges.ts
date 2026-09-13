import { z } from "zod";

import { perform, type AdminDeps, type AdminResult } from "@/src/application/admin/core";
import type { EmailSender } from "@/src/domain/ports/email";
import { buildPledgeEmail, buildStaffEmail } from "@/src/application/emails/messages";
import type { Locale } from "@/src/i18n/locale";

import { requiredText, uuid } from "./fields";

const fulfillSchema = z.object({
  id: uuid("la reserva"),
});

const cancelSchema = z.object({
  id: uuid("la reserva"),
  reason: requiredText("el motivo", 300),
});

export interface PledgeMail {
  readonly sender: EmailSender;
  readonly siteUrl: string;
  readonly staffAddress: string | null;
  readonly record: (input: {
    kind: "pledge.fulfilled" | "staff.pledge_cancelled";
    pledgeId: string;
    result: Awaited<ReturnType<EmailSender["send"]>>;
  }) => Promise<void>;
  readonly contactOf: (userId: string) => Promise<string | null>;
  readonly localeOf: (userId: string) => Promise<Locale>;
  readonly what: string;
  readonly userId: string | null;
}

/**
 * Confirmar que el material llegó. Mueve el contador de reserved a fulfilled
 * y no toca ningún total de dinero (SC-209, ADR-031).
 */
export async function fulfillPledge(
  deps: AdminDeps,
  input: unknown,
  mail: PledgeMail | null,
): Promise<AdminResult<{ id: string }>> {
  const result = await perform({
    deps,
    permission: "donaciones.escribir",
    describe: "confirmar la llegada",
    schema: fulfillSchema,
    input,
    run: async (parsed) => {
      await deps.gateway.donations.fulfillPledge(parsed.id);

      return parsed;
    },
    success: () => "Llegada confirmada.",
    audit: (parsed) => ({
      action: "pledge.fulfilled",
      entityTable: "donation_pledges",
      entityId: parsed.id,
      diff: null,
    }),
  });

  if (result.status !== "ok" || mail === null || mail.userId === null) {
    return result;
  }

  try {
    const locale = await mail.localeOf(mail.userId);
    const recipient = await mail.contactOf(mail.userId);

    if (recipient !== null) {
      const sent = await mail.sender.send(
        "pledge.fulfilled",
        buildPledgeEmail("pledge.fulfilled", {
          pledgeId: result.value.id,
          recipient,
          locale,
          what: mail.what,
          expiresOn: null,
          accountUrl: `${mail.siteUrl}/cuenta`,
        }),
      );

      await mail.record({
        kind: "pledge.fulfilled",
        pledgeId: result.value.id,
        result: sent,
      });
    }
  } catch (error) {
    deps.logger.error("No se pudo avisar la llegada", { error });
  }

  return result;
}

/** Cancelar una reserva ajena. El motivo es obligatorio. */
export async function cancelPledge(
  deps: AdminDeps,
  input: unknown,
  mail: PledgeMail | null,
): Promise<AdminResult<{ id: string }>> {
  const result = await perform({
    deps,
    permission: "donaciones.escribir",
    describe: "cancelar la reserva",
    schema: cancelSchema,
    input,
    run: async (parsed) => {
      await deps.gateway.donations.cancelPledge({
        id: parsed.id,
        reason: parsed.reason,
      });

      return parsed;
    },
    success: () => "Reserva cancelada.",
    audit: (parsed) => ({
      action: "pledge.cancelled",
      entityTable: "donation_pledges",
      entityId: parsed.id,
      diff: { reason: true },
    }),
  });

  if (result.status !== "ok" || mail === null || mail.staffAddress === null) {
    return result;
  }

  try {
    const sent = await mail.sender.send(
      "staff.pledge_cancelled",
      buildStaffEmail("staff.pledge_cancelled", {
        subjectId: result.value.id,
        staffAddress: mail.staffAddress,
        what: mail.what,
        backofficeUrl: `${mail.siteUrl}/admin/donaciones`,
      }),
    );

    await mail.record({
      kind: "staff.pledge_cancelled",
      pledgeId: result.value.id,
      result: sent,
    });
  } catch (error) {
    deps.logger.error("No se pudo avisar la cancelación al equipo", { error });
  }

  return result;
}
