"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/components/admin/form";
import {
  attachExpenseReceipt,
  recordExpense,
  voidExpense,
} from "@/src/application/admin";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

/** Un gasto cambia las cifras de la home y el libro de transparencia. */
function revalidateLedger(): void {
  revalidatePath("/");
  revalidatePath("/transparencia");
  revalidatePath("/reconstruccion");
  revalidatePath("/admin/gastos");
}

export async function recordExpenseAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await recordExpense(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidateLedger();
  }

  return result;
}

export async function voidExpenseAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await voidExpense(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidateLedger();
  }

  return result;
}

export async function attachReceiptAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await attachExpenseReceipt(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    // El comprobante en sí no se publica, pero su existencia sí: el libro público
    // dice "con comprobante" (FR-013).
    revalidateLedger();
  }

  return result;
}
