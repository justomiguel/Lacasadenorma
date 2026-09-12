"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/components/admin/form";
import {
  markReconciled,
  recordContribution,
  voidContribution,
} from "@/src/application/admin";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

/**
 * Un aporte cambia el total recibido, que aparece en la home y en transparencia. El
 * detalle **no** se publica en ninguna parte: lo que cambia afuera es la suma
 * (FR-014, ADR-016).
 */
function revalidateTotals(): void {
  revalidatePath("/");
  revalidatePath("/transparencia");
  revalidatePath("/admin/aportes");
}

export async function recordContributionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await recordContribution(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidateTotals();
  }

  return result;
}

export async function voidContributionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await voidContribution(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidateTotals();
  }

  return result;
}

export async function markReconciledAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await markReconciled(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidateTotals();
  }

  return result;
}
