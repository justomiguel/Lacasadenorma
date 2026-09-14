import { z } from "zod";

import { DONATION_UNITS } from "@/src/domain/entities";
import { formatMoney } from "@/src/domain/money";

import { perform, type AdminDeps, type AdminResult } from "./core";
import {
  checkbox,
  currency,
  optionalText,
  optionalUuid,
  positiveInt,
  requiredText,
  sortOrder,
  toMoney,
  uuid,
} from "./fields";

/**
 * Ítems del catálogo de donaciones en especie.
 *
 * El valor estimado es opcional y no se publica: si no hay cifra, no se inventa
 * un cero (FR-214, D3). La foto lleva `alt` obligatorio cuando se sube.
 */

const saveSchema = z
  .object({
    campaignId: uuid("la campaña"),
    id: optionalUuid,
    title: requiredText("el ítem", 140),
    description: optionalText(500),
    unit: z.enum(DONATION_UNITS, { error: "Elegí la unidad." }),
    neededQuantity: positiveInt("cuántas hacen falta"),
    budgetItemId: optionalUuid,
    amount: z.string().optional(),
    currency,
    photoMediaId: optionalUuid,
    file: z
      .instanceof(File)
      .optional()
      .transform((file) => (file !== undefined && file.size > 0 ? file : null)),
    alt: optionalText(300),
    caption: optionalText(300),
    credit: optionalText(120),
    sortOrder,
    publish: checkbox,
  })
  .superRefine((data, ctx) => {
    if (data.file !== null && (data.alt === null || data.alt.length < 10)) {
      ctx.addIssue({
        code: "custom",
        path: ["alt"],
        message: "La descripción tiene que decir qué se ve: al menos diez caracteres.",
      });
    }
  })
  .transform((data, ctx) => {
    const written = data.amount?.trim() ?? "";

    if (written.length === 0) {
      return { ...data, money: null };
    }

    const value = toMoney(ctx, written, data.currency);

    return value === null ? z.NEVER : { ...data, money: value };
  });

export async function saveDonationItem(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "catalogo.escribir",
    describe: "guardar el ítem del catálogo",
    schema: saveSchema,
    input,
    run: async (data) => {
      let photoMediaId = data.photoMediaId;

      if (data.file !== null) {
        const media = await deps.gateway.updates.createMedia({
          file: data.file,
          alt: data.alt ?? "",
          caption: data.caption,
          credit: data.credit,
          takenOn: null,
          poster: null,
        });
        photoMediaId = media.id;
      }

      return {
        id: await deps.gateway.catalog.saveItem({
          campaignId: data.campaignId,
          id: data.id,
          title: data.title,
          description: data.description,
          unit: data.unit,
          neededQuantity: data.neededQuantity,
          budgetItemId: data.budgetItemId,
          estimatedValue: data.money,
          photoMediaId,
          sortOrder: data.sortOrder,
          publish: data.publish,
        }),
      };
    },
    success: () => "Ítem guardado.",
    audit: (data, output) => ({
      action: data.id === null ? "donation_item.created" : "donation_item.updated",
      entityTable: "donation_items",
      entityId: output.id,
      diff: {
        title: data.title,
        needed: data.neededQuantity,
        published: data.publish,
        estimated: data.money === null ? null : formatMoney(data.money),
      },
    }),
  });
}
