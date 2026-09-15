"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/components/admin/form";
import {
  markReconciled,
  recordContribution,
  setPublishContributionShare,
  updateContributionAppearance,
  voidContribution,
} from "@/src/application/admin";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

/**
 * Un aporte cambia el total recibido (home y transparencia) y, si hay
 * consentimiento, el muro de nombres. El monto **no** se publica (FR-014,
 * ADR-016, ADR-042).
 */
function revalidateAportes(): void {
  revalidatePath("/");
  revalidatePath("/transparencia");
  revalidatePath("/admin/aportes");
  revalidatePath("/quienes-ayudaron");
  revalidatePath("/en/quienes-ayudaron");
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
    revalidateAportes();
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
    revalidateAportes();
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
    revalidateAportes();
  }

  return result;
}

export async function setPublishContributionShareAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await setPublishContributionShare(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidateAportes();
  }

  return result;
}

export async function updateContributionAppearanceAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await updateContributionAppearance(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidateAportes();
  }

  return result;
}
