"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/components/admin/form";
import { deleteDonationItem, saveDonationItem } from "@/src/application/admin";
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

/**
 * Borrar un ítem que nadie tomó. Si hay reservas, el caso de uso traduce el
 * `23503` (ADR-050).
 */
export async function deleteDonationItemAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await deleteDonationItem(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/admin/catalogo");
    revalidatePath("/catalogo");
    revalidatePath("/en/catalogo");
    revalidatePath(`/catalogo/${result.value.id}`);
    revalidatePath(`/en/catalogo/${result.value.id}`);
    redirect("/admin/catalogo?hecho=borrado");
  }

  return result;
}
