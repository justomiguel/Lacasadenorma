"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/components/admin/form";
import { saveDonationItem } from "@/src/application/admin";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

/**
 * Guardar un ítem del catálogo.
 *
 * Publicar o cambiar cantidades invalida `/catalogo` en los dos idiomas
 * (ADR-017). La reserva todavía no existe: esta acción no toca pledges.
 */
export async function saveDonationItemAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await saveDonationItem(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/admin/catalogo");
    revalidatePath("/catalogo");
    revalidatePath("/en/catalogo");
  }

  return result;
}
