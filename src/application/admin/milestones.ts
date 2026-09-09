import { z } from "zod";

import { MILESTONE_STATUSES } from "@/src/domain/entities";

import { perform, type AdminDeps, type AdminResult } from "./core";
import {
  checkbox,
  optionalPastDate,
  optionalText,
  optionalUuid,
  requiredText,
  sortOrder,
  uuid,
} from "./fields";

/**
 * Hitos de obra.
 *
 * La fecha es opcional porque un hito pendiente no tiene fecha, y estimarla sería
 * publicar una promesa. Un hito `completado` sin fecha, en cambio, es un dato
 * incompleto: si algo ya pasó, se sabe cuándo. Esa asimetría se valida acá.
 */

const saveSchema = z
  .object({
    campaignId: uuid("la campaña"),
    id: optionalUuid,
    title: requiredText("el hito", 140),
    description: optionalText(500),
    status: z.enum(MILESTONE_STATUSES, { error: "Elegí el estado." }),
    happenedOn: optionalPastDate,
    sortOrder,
    publish: checkbox,
  })
  .refine((data) => data.status !== "completado" || data.happenedOn !== null, {
    path: ["happenedOn"],
    message: "Un hito completado tiene fecha: poné cuándo se terminó.",
  });

export async function saveMilestone(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "hitos.escribir",
    describe: "guardar el hito",
    schema: saveSchema,
    input,
    run: async (data) => ({
      id: await deps.gateway.milestones.saveMilestone({
        campaignId: data.campaignId,
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        happenedOn: data.happenedOn,
        sortOrder: data.sortOrder,
        publish: data.publish,
      }),
    }),
    success: () => "Hito guardado.",
  });
}
