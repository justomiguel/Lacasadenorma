import { z } from "zod";

import { perform, type AdminDeps, type AdminResult } from "@/src/application/admin/core";

import { optionalText, uuid } from "./fields";

const updateSchema = z.object({
  id: uuid("la reserva"),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "La cantidad tiene que ser un entero mayor que cero."),
  nota: optionalText(500),
  contactName: optionalText(80),
  contactPhone: optionalText(40),
});

/**
 * Corregir cantidad, nota o contacto de una reserva anotada.
 *
 * No manda correo: cambiar lo que ya se anotó no es un hecho nuevo para
 * quien reservó ni para el equipo.
 */
export async function updatePledge(
  deps: AdminDeps,
  input: unknown,
  _mail: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "donaciones.escribir",
    describe: "editar la reserva",
    schema: updateSchema,
    input,
    run: async (parsed) => {
      await deps.gateway.donations.updatePledge({
        id: parsed.id,
        quantity: parsed.quantity,
        note: parsed.nota,
        contactName: parsed.contactName,
        contactPhone: parsed.contactPhone,
      });

      return { id: parsed.id };
    },
    success: () => "Reserva actualizada.",
    audit: (parsed) => ({
      action: "pledge.updated",
      entityTable: "donation_pledges",
      entityId: parsed.id,
      diff: null,
    }),
  });
}
