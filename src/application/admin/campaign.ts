import { z } from "zod";

import { CampaignExistsError } from "@/src/domain/errors";
import { formatMoney } from "@/src/domain/money";

import { perform, type AdminDeps, type AdminResult } from "./core";
import {
  checkbox,
  currency,
  optionalText,
  optionalUuid,
  requiredText,
  sortOrder,
  toMoney,
  uuid,
} from "./fields";

/**
 * El slug canónico de este sitio. El modelo lo nombra (`data-model.md`) y no se
 * le pide a quien crea la campaña: una sola campaña, una sola dirección.
 */
export const FIRST_CAMPAIGN_SLUG = "casa-de-norma";

/**
 * Objetivo de recaudación y rubros del presupuesto.
 *
 * El objetivo puede quedar **vacío**, y no es un descuido: mientras no haya un
 * presupuesto de obra hecho por alguien que sepa, publicar una meta sería inventar
 * una cifra. La página muestra la barra sin porcentaje cuando no hay objetivo, y eso
 * es más honesto que un número redondo elegido a ojo.
 *
 * Lo mismo con cada rubro: `estimatedAmount` es opcional. Un rubro sin cotizar se
 * publica igual, porque saber *qué* falta arreglar también es información, y aparece
 * como "sin cotizar" en lugar de con un cero que se leería como "gratis".
 */

const goalSchema = z
  .object({
    campaignId: uuid("la campaña"),
    /** Vacío significa "todavía no hay objetivo", que es distinto de cero. */
    amount: z.string().optional(),
    currency,
  })
  .transform(({ amount, currency: code, ...rest }, ctx) => {
    const written = amount?.trim() ?? "";

    if (written.length === 0) {
      return { ...rest, money: null };
    }

    const money = toMoney(ctx, written, code);

    return money === null ? z.NEVER : { ...rest, money };
  });

const createCampaignSchema = z.object({
  title: requiredText("el título", 140),
  summary: requiredText("el resumen", 500),
  publish: checkbox,
});

export async function createCampaign(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "campana.escribir",
    describe: "crear la campaña",
    schema: createCampaignSchema,
    input,
    run: async (data) => {
      if ((await deps.gateway.campaign.getCampaign()) !== null) {
        throw new CampaignExistsError();
      }

      return {
        id: await deps.gateway.campaign.createCampaign({
          slug: FIRST_CAMPAIGN_SLUG,
          title: data.title,
          summary: data.summary,
          publish: data.publish,
        }),
      };
    },
    success: () => "Campaña creada. Ya se pueden cargar gastos, aportes y el catálogo.",
    audit: (data, output) => ({
      action: "campaign.created",
      entityTable: "campaigns",
      entityId: output.id,
      diff: { title: data.title, published: data.publish },
    }),
  });
}

export async function updateGoal(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<null>> {
  return perform({
    deps,
    permission: "campana.escribir",
    describe: "actualizar el objetivo",
    schema: goalSchema,
    input,
    run: async (data) => {
      await deps.gateway.campaign.updateGoal({
        campaignId: data.campaignId,
        goal: data.money,
      });

      return null;
    },
    success: () => "Objetivo actualizado.",
    audit: (data) => ({
      action: "campaign.goal_updated",
      entityTable: "campaigns",
      entityId: data.campaignId,
      diff: { goal: data.money === null ? null : formatMoney(data.money) },
    }),
  });
}

const budgetItemSchema = z
  .object({
    campaignId: uuid("la campaña"),
    id: optionalUuid,
    title: requiredText("el rubro", 140),
    description: optionalText(500),
    amount: z.string().optional(),
    currency,
    sortOrder,
    publish: checkbox,
  })
  .transform(({ amount, currency: code, ...rest }, ctx) => {
    const written = amount?.trim() ?? "";

    if (written.length === 0) {
      return { ...rest, money: null };
    }

    const money = toMoney(ctx, written, code);

    return money === null ? z.NEVER : { ...rest, money };
  });

export async function saveBudgetItem(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "campana.escribir",
    describe: "guardar el rubro",
    schema: budgetItemSchema,
    input,
    run: async (data) => ({
      id: await deps.gateway.campaign.saveBudgetItem({
        campaignId: data.campaignId,
        id: data.id,
        title: data.title,
        description: data.description,
        estimatedAmount: data.money,
        sortOrder: data.sortOrder,
        publish: data.publish,
      }),
    }),
    success: () => "Rubro guardado.",
    audit: (data, output) => ({
      action: data.id === null ? "budget_item.created" : "budget_item.updated",
      entityTable: "budget_items",
      entityId: output.id,
      diff: {
        title: data.title,
        estimated: data.money === null ? null : formatMoney(data.money),
        published: data.publish,
      },
    }),
  });
}

const shareSchema = z.object({
  campaignId: uuid("la campaña"),
  publishShare: checkbox,
});

export async function setPublishContributionShare(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<boolean>> {
  return perform({
    deps,
    permission: "campana.escribir",
    describe: "cambiar si el muro muestra el porcentaje",
    schema: shareSchema,
    input,
    run: async (data) => {
      await deps.gateway.campaign.setPublishContributionShare(data);

      return data.publishShare;
    },
    success: (publishShare) =>
      publishShare
        ? "El muro va a mostrar el porcentaje de cada aporte sobre lo que ya llegó."
        : "El muro va a mostrar sólo el nombre.",
    audit: (data) => ({
      action: "campaign.contribution_share_toggled",
      entityTable: "campaigns",
      entityId: data.campaignId,
      diff: { publishContributionShare: data.publishShare },
    }),
  });
}
