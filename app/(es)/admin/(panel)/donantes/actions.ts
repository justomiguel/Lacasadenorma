"use server";

import { revalidatePath } from "next/cache";

import { revalidateDonationPages } from "@/app/(es)/revalidate-donations";

import type { ActionState } from "@/components/admin/form";
import {
  provisionDonorAccount,
  recordContribution,
  recordDonorArrival,
  regenerateDonorInvite,
  reviewDonorAccount,
} from "@/src/application/admin";
import { getEmailSender } from "@/src/infrastructure/email";
import { recordEmailDelivery } from "@/src/infrastructure/email/deliveries";
import { getSiteUrl } from "@/src/infrastructure/site-url";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";
import { createDonorAuth } from "@/src/infrastructure/supabase/provision-donor";

export async function reviewDonorAccountAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await reviewDonorAccount(deps, Object.fromEntries(formData), {
    sender: getEmailSender(),
    siteUrl: getSiteUrl(),
    contactOf: (userId) => deps.gateway.donors.contactOf(userId),
    record: async ({ kind, userId, result: sent }) => {
      await recordEmailDelivery({
        kind,
        subjectId: userId,
        result: sent,
        userId,
      });
    },
  });

  if (result.status === "ok") {
    revalidatePath("/admin/donantes");
  }

  return result;
}

export async function provisionDonorAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const auth = createDonorAuth(getSiteUrl());

  if (auth === null) {
    return {
      status: "failed",
      message: "No se puede crear la cuenta: falta la clave de Auth.",
    };
  }

  const result = await provisionDonorAccount(deps, Object.fromEntries(formData), auth, {
    sender: getEmailSender(),
    siteUrl: getSiteUrl(),
    record: async ({ kind, userId, result: sent }) => {
      await recordEmailDelivery({
        kind,
        subjectId: userId,
        result: sent,
        userId,
      });
    },
  });

  if (result.status === "ok") {
    revalidateDonor(result.value.userId);
  }

  return result;
}

export async function regenerateInviteAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const auth = createDonorAuth(getSiteUrl());

  if (auth === null) {
    return {
      status: "failed",
      message: "No se puede generar el enlace: falta la clave de Auth.",
    };
  }

  const userId = formData.get("userId");
  const result = await regenerateDonorInvite(
    deps,
    { userId: typeof userId === "string" ? userId : "" },
    auth,
  );

  if (result.status === "ok") {
    revalidateDonor(typeof userId === "string" ? userId : undefined);
  }

  return result;
}

export async function recordDonorContributionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await recordContribution(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/");
    revalidatePath("/transparencia");
    revalidatePath("/admin/aportes");
    revalidatePath("/quienes-ayudaron");
    revalidatePath("/en/quienes-ayudaron");
    const userId = formData.get("userId");
    revalidateDonor(typeof userId === "string" ? userId : undefined);
  }

  return result;
}

export async function recordDonorArrivalAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const input = Object.fromEntries(formData);

  if (formData.get("appearOnWall") !== "on") {
    input.displayName = "";
  }

  const result = await recordDonorArrival(deps, input);

  if (result.status === "ok") {
    revalidateDonationPages();
    revalidatePath("/admin/donaciones");
    revalidatePath("/admin/catalogo");
    const userId = formData.get("userId");
    revalidateDonor(typeof userId === "string" ? userId : undefined);
  }

  return result;
}

function revalidateDonor(userId?: string): void {
  revalidatePath("/admin/donantes");

  if (userId !== undefined && userId.length > 0) {
    revalidatePath(`/admin/donantes/${userId}`);
  }
}
