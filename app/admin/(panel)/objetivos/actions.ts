"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/components/admin/form";
import { saveBudgetItem, updateGoal } from "@/src/application/admin";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

/**
 * Las acciones de objetivo y presupuesto.
 *
 * El objetivo aparece en todas las páginas que muestran el avance, y el presupuesto en
 * dos, así que las dos acciones invalidan el mismo conjunto de rutas. Se invalida de
 * más antes que de menos: una página con un objetivo viejo es un número equivocado a la
 * vista del público, y el costo de regenerar cuatro rutas es un render.
 */
function revalidateFigures(): void {
  revalidatePath("/");
  revalidatePath("/reconstruccion");
  revalidatePath("/transparencia");
  revalidatePath("/ayudar");
}

export async function updateGoalAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await updateGoal(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/admin/objetivos");
    revalidateFigures();
  }

  return result;
}

export async function saveBudgetItemAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await saveBudgetItem(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/admin/objetivos");
    revalidateFigures();
  }

  return result;
}
