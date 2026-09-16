"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { revalidateDonationPages } from "@/app/(es)/revalidate-donations";

import type { ActionState } from "@/components/admin/form";
import { cancelPledge, fulfillPledge } from "@/src/application/admin";
import {
  isStaffPledgeDecision,
  STAFF_CONTACT_REJECT_REASON,
} from "@/src/domain/staff-pledge-decision";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";
import { getEmailSender, readStaffAddress } from "@/src/infrastructure/email";
import { recordEmailDelivery } from "@/src/infrastructure/email/deliveries";
import { getSiteUrl } from "@/src/infrastructure/site-url";
import { isLocale } from "@/src/i18n/locale";

function mailOf(
  deps: NonNullable<Awaited<ReturnType<typeof getAdminDeps>>>,
  formData: FormData,
) {
  const userIdRaw = formData.get("userId");
  const userId = typeof userIdRaw === "string" && userIdRaw.length > 0 ? userIdRaw : null;
  const whatRaw = formData.get("what");
  const what = typeof whatRaw === "string" ? whatRaw : "";

  return {
    sender: getEmailSender(),
    siteUrl: getSiteUrl(),
    staffAddress: readStaffAddress(),
    what,
    userId,
    contactOf: (id: string) => deps.gateway.donors.contactOf(id),
    localeOf: async (id: string) => {
      const accounts = await deps.gateway.donors.listAccounts();
      const match = accounts.find((account) => account.userId === id);

      return match !== undefined && isLocale(match.locale) ? match.locale : "es";
    },
    record: async ({
      kind,
      pledgeId,
      result,
    }: {
      kind: "pledge.fulfilled" | "staff.pledge_cancelled";
      pledgeId: string;
      result: Awaited<ReturnType<ReturnType<typeof getEmailSender>["send"]>>;
    }) => {
      await recordEmailDelivery({
        kind,
        subjectId: pledgeId,
        result,
        ...(userId === null ? {} : { userId }),
      });
    },
  };
}

export async function fulfillPledgeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await fulfillPledge(
    deps,
    Object.fromEntries(formData),
    mailOf(deps, formData),
  );

  if (result.status === "ok") {
    revalidatePath("/admin/donaciones");
    revalidateDonationPages();
  }

  return result;
}

export async function cancelPledgeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await cancelPledge(
    deps,
    Object.fromEntries(formData),
    mailOf(deps, formData),
  );

  if (result.status === "ok") {
    revalidatePath("/admin/donaciones");
    revalidateDonationPages();
  }

  return result;
}

/**
 * Los dos enlaces del correo: sí donan, o no y se suelta (ADR-051).
 *
 * El GET no muta. Acá sí. Un no no vuelve a avisarle al equipo: ya lo acaba
 * de decidir.
 */
export async function decidePledgeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const decisionRaw = formData.get("decision");
  const decision = typeof decisionRaw === "string" ? decisionRaw : "";

  if (!isStaffPledgeDecision(decision)) {
    return { status: "invalid", message: "Esa decisión no existe.", fieldErrors: {} };
  }

  const result =
    decision === "si"
      ? await fulfillPledge(deps, Object.fromEntries(formData), mailOf(deps, formData))
      : await cancelPledge(
          deps,
          { id: formData.get("id"), reason: STAFF_CONTACT_REJECT_REASON },
          null,
        );

  if (result.status === "ok") {
    revalidatePath("/admin/donaciones");
    revalidateDonationPages();
    redirect("/admin/donaciones");
  }

  return result;
}
