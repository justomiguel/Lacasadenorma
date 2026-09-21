import { z } from "zod";

import { perform, type AdminDeps, type AdminResult } from "@/src/application/admin/core";

import { optionalText, positiveInt, uuid } from "./fields";

const arrivalSchema = z.object({
  userId: uuid("la persona"),
  itemId: uuid("el ítem"),
  quantity: positiveInt("la cantidad"),
  displayName: optionalText(80),
});

/**
 * Anota una entrega que ya llegó, sin pasar por reserva. El cupo lo
 * comprueba el puerto; si no hay lugar, `perform` lo marca en `quantity`.
 */
export async function recordDonorArrival(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "donaciones.escribir",
    describe: "anotar la llegada",
    schema: arrivalSchema,
    input,
    run: async (data) => ({
      id: await deps.gateway.donations.recordArrival({
        userId: data.userId,
        itemId: data.itemId,
        quantity: data.quantity,
        displayName: data.displayName,
      }),
    }),
    success: () => "Entrega anotada.",
    audit: (data, output) => ({
      action: "pledge.recorded",
      entityTable: "donation_pledges",
      entityId: output.id,
      diff: { itemId: data.itemId, quantity: data.quantity },
    }),
  });
}
