"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/components/admin/form";
import { saveMilestone } from "@/src/application/admin";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

/**
 * La acción de hitos.
 *
 * Un hito publicado cambia la línea de tiempo de `/reconstruccion` y el porcentaje de
 * avance que el sitio informa, así que las dos rutas se invalidan juntas. La home
 * también: muestra el último hito completado.
 */
export async function saveMilestoneAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await saveMilestone(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/admin/hitos");
    revalidatePath("/");
    revalidatePath("/reconstruccion");
  }

  return result;
}
