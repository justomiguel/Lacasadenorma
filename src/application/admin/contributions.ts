import { z } from "zod";

import { formatMoney } from "@/src/domain/money";

import { perform, type AdminDeps, type AdminResult } from "./core";
import {
  currency,
  optionalText,
  optionalUuid,
  pastDate,
  toMoney,
  uuid,
  voidReason,
} from "./fields";

/**
 * Aportes: registrar, anular, marcar la conciliación.
 *
 * Un aporte es el único dato del sistema que **no** es público ni siquiera en
 * detalle agregado por fila (FR-014): en un pueblo donde todos se conocen, "medio
 * millón el 3 de septiembre" alcanza para saber quién fue. Por eso el registro no
 * guarda el nombre de quien aportó: guarda una nota de conciliación, que es lo que
 * hace falta para cruzarlo con el resumen del banco, y nada más.
 *
 * La conciliación no es un adorno: la fecha que se marca acá es la que la página
 * pública muestra, y si tiene más de treinta días el sitio lo dice solo. Es la forma
 * de que "las cifras están al día" sea una afirmación verificable y no una promesa.
 */

const recordSchema = z
  .object({
    campaignId: uuid("la campaña"),
    amount: z.string({ error: "Falta el monto." }),
    currency,
    receivedAt: pastDate,
    paymentMethodId: optionalUuid,
    /**
     * Con qué dato del resumen bancario se identifica el movimiento. Nunca el nombre
     * de quien aportó: eso convertiría la tabla en un padrón de donantes.
     */
    sourceNote: optionalText(200),
  })
  .transform(({ amount, currency: code, ...rest }, ctx) => {
    const money = toMoney(ctx, amount, code);

    return money === null ? z.NEVER : { ...rest, money };
  });

export async function recordContribution(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "finanzas.escribir",
    describe: "registrar el aporte",
    schema: recordSchema,
    input,
    run: async (data) => ({
      id: await deps.gateway.contributions.recordContribution({
        campaignId: data.campaignId,
        amount: data.money,
        receivedAt: data.receivedAt,
        paymentMethodId: data.paymentMethodId,
        sourceNote: data.sourceNote,
      }),
    }),
    success: () => "Aporte registrado. El total público ya lo incluye.",
    audit: (data, output) => ({
      action: "contribution.created",
      entityTable: "contributions",
      entityId: output.id,
      diff: {
        amount: formatMoney(data.money),
        receivedAt: data.receivedAt,
        // La nota **no** va al diff: es lo más cercano a un dato personal que hay
        // en el sistema, y el registro de auditoría lo leen más roles que la tabla.
        hasSourceNote: data.sourceNote !== null,
      },
    }),
  });
}

const voidSchema = z.object({
  id: uuid("el aporte"),
  reason: voidReason,
});

export async function voidContribution(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<null>> {
  return perform({
    deps,
    permission: "finanzas.escribir",
    describe: "anular el aporte",
    schema: voidSchema,
    input,
    run: async (data) => {
      await deps.gateway.contributions.voidContribution(data);

      return null;
    },
    success: () => "Aporte anulado. Sigue en el historial y ya no suma.",
    audit: (data) => ({
      action: "contribution.voided",
      entityTable: "contributions",
      entityId: data.id,
      diff: { reason: data.reason },
    }),
  });
}

const reconcileSchema = z.object({
  campaignId: uuid("la campaña"),
  reconciledAt: pastDate,
});

export async function markReconciled(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<null>> {
  return perform({
    deps,
    permission: "finanzas.escribir",
    describe: "marcar la conciliación",
    schema: reconcileSchema,
    input,
    run: async (data) => {
      await deps.gateway.contributions.markReconciled(data);

      return null;
    },
    success: () => "Conciliación registrada. La fecha ya aparece en transparencia.",
    audit: (data) => ({
      action: "campaign.reconciled",
      entityTable: "campaigns",
      entityId: data.campaignId,
      diff: { reconciledAt: data.reconciledAt },
    }),
  });
}
