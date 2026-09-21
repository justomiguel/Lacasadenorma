import { z } from "zod";

import { perform, type AdminDeps, type AdminResult } from "@/src/application/admin/core";
import { REVERT_PLEDGE_DEFAULT_REASON } from "@/src/domain/entities/donation-pledge";
import type { EmailSender } from "@/src/domain/ports/email";
import { buildPledgeEmail, buildStaffEmail } from "@/src/application/emails/messages";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

import { checkbox, optionalText, requiredText, uuid } from "./fields";

const acceptSchema = z
  .object({
    id: uuid("la reserva"),
    aparecer: checkbox,
    nombre: optionalText(80),
    nota: optionalText(500),
  })
  .superRefine((data, ctx) => {
    if (data.aparecer && data.nombre === null) {
      ctx.addIssue({
        code: "custom",
        path: ["nombre"],
        message: "Para aparecer en la lista hace falta un nombre.",
      });
    }
  })
  .transform(({ id, aparecer, nombre, nota }) => ({
    id,
    displayName: aparecer ? nombre : null,
    note: nota,
  }));

const fulfillSchema = z.object({
  id: uuid("la reserva"),
});

const cancelSchema = z.object({
  id: uuid("la reserva"),
  reason: requiredText("el motivo", 300),
});

const deleteSchema = z.object({
  id: uuid("la reserva"),
  title: requiredText("el ítem", 140),
});

const revertSchema = z.object({
  id: uuid("la reserva"),
  title: requiredText("el ítem", 140),
  reason: optionalText(300),
});

export interface PledgeMail {
  readonly sender: EmailSender;
  readonly siteUrl: string;
  readonly staffAddress: string | null;
  readonly record: (input: {
    kind: "pledge.fulfilled" | "pledge.reverted" | "staff.pledge_cancelled";
    pledgeId: string;
    result: Awaited<ReturnType<EmailSender["send"]>>;
  }) => Promise<void>;
  readonly contactOf: (userId: string) => Promise<string | null>;
  readonly localeOf: (userId: string) => Promise<Locale>;
  readonly what: string;
  readonly userId: string | null;
}

/**
 * Confirmar que van a donar. No mueve el contador ni manda el correo de
 * llegada: eso es el segundo paso.
 */
export async function acceptPledge(
  deps: AdminDeps,
  input: unknown,
  _mail: PledgeMail | null,
): Promise<AdminResult<{ id: string }>> {
  const result = await perform({
    deps,
    permission: "donaciones.escribir",
    describe: "confirmar que van a donar",
    schema: acceptSchema,
    input,
    run: async (parsed) => {
      await deps.gateway.donations.acceptPledge(parsed);

      return parsed;
    },
    success: () => "Quedó tomada. Pendiente de entrega.",
    audit: (parsed) => ({
      action: "pledge.accepted",
      entityTable: "donation_pledges",
      entityId: parsed.id,
      diff: null,
    }),
  });

  return result;
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
      await deps.gateway.donations.fulfillPledge(parsed);

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

/**
 * Deshace un Donado: vuelve las unidades al catálogo y deja la reserva
 * cancelada. El correo va a quien donó, no al equipo.
 */
export async function revertPledge(
  deps: AdminDeps,
  input: unknown,
  mail: PledgeMail | null,
): Promise<AdminResult<{ id: string }>> {
  const result = await perform({
    deps,
    permission: "donaciones.escribir",
    describe: "revertir la donación",
    schema: revertSchema,
    input,
    run: async (parsed) => {
      const reason = parsed.reason ?? REVERT_PLEDGE_DEFAULT_REASON;

      await deps.gateway.donations.revertPledge({ id: parsed.id, reason });

      return { ...parsed, reason };
    },
    success: () => "Donación revertida.",
    audit: (parsed) => ({
      action: "pledge.reverted",
      entityTable: "donation_pledges",
      entityId: parsed.id,
      diff: { title: parsed.title },
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
        "pledge.reverted",
        buildPledgeEmail("pledge.reverted", {
          pledgeId: result.value.id,
          recipient,
          locale,
          what: mail.what,
          expiresOn: null,
          accountUrl: `${mail.siteUrl}${localizedHref("/catalogo", locale)}`,
        }),
      );

      await mail.record({
        kind: "pledge.reverted",
        pledgeId: result.value.id,
        result: sent,
      });
    }
  } catch (error) {
    deps.logger.error("No se pudo avisar la reversión", { error });
  }

  return result;
}

export { recordDonorArrival } from "./record-arrival";
export { updatePledge } from "./update-pledge";

/** Saca la reserva del listado y del muro. Devuelve las unidades si seguían comprometidas. */
export async function deletePledge(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "donaciones.escribir",
    describe: "borrar la reserva",
    schema: deleteSchema,
    input,
    run: async (parsed) => {
      await deps.gateway.donations.deletePledge(parsed.id);

      return parsed;
    },
    success: () => "Donación borrada.",
    audit: (parsed) => ({
      action: "pledge.deleted",
      entityTable: "donation_pledges",
      entityId: parsed.id,
      diff: { title: parsed.title },
    }),
  });
}

/** Saca un aviso por teléfono. */
export async function deleteOffer(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "donaciones.escribir",
    describe: "borrar el aviso",
    schema: deleteSchema,
    input,
    run: async (parsed) => {
      await deps.gateway.donations.deleteOffer(parsed.id);

      return parsed;
    },
    success: () => "Aviso borrado.",
    audit: (parsed) => ({
      action: "pledge.deleted",
      entityTable: "donation_offers",
      entityId: parsed.id,
      diff: { title: parsed.title },
    }),
  });
}
