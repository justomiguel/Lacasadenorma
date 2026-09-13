"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/components/admin/form";
import { reviewDonorAccount } from "@/src/application/admin";
import { getEmailSender } from "@/src/infrastructure/email";
import { recordEmailDelivery } from "@/src/infrastructure/email/deliveries";
import { getSiteUrl } from "@/src/infrastructure/site-url";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

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
