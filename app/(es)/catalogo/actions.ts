"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { claimItem } from "@/src/application/use-cases/claim-item";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";
import { notifyPledgeClaimed } from "@/src/infrastructure/donations/notify";
import { localizeHref, type Locale } from "@/src/i18n/locale";

import { failure, localeOf, textOf, type AccountFormState } from "../cuenta/form-state";

/**
 * Anotarse a traer un ítem.
 *
 * Sin sesión redirige a ingresar con `volver` validado, para volver al mismo
 * renglón (US1 escenario 6). Si alguien se adelantó, redirige al catálogo con
 * el aviso diseñado y el listado ya revalidado.
 */
export async function claimItemAction(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const itemId = textOf(formData, "itemId");
  const catalog = localizeHref("/catalogo", locale);
  const deps = await getAccountDeps();

  if (deps.session.status === "anonymous") {
    const volver = encodeURIComponent(`${catalog}?item=${itemId}`);

    redirect(`${localizeHref("/cuenta/ingresar", locale)}?volver=${volver}`);
  }

  const result = await claimItem(
    {
      ...deps,
      afterClaim: (pledge) => notifyPledgeClaimed(pledge, locale),
    },
    {
      itemId,
      quantity: textOf(formData, "cantidad") || "1",
      anonymous: formData.get("aparecer") === null ? "si" : "no",
      displayName: textOf(formData, "nombre"),
      note: textOf(formData, "nota"),
    },
  );

  if (result.status === "error") {
    if (result.code === "ahead") {
      revalidatePath(catalog);
      revalidatePath(localizeHref("/catalogo", locale === "es" ? "en" : "es"));
      redirect(`${catalog}?conflicto=${itemId}`);
    }

    return failure(result.code, result.field);
  }

  revalidatePath(catalog);
  revalidatePath(localizeHref("/cuenta", locale));
  redirect(localizeHref("/cuenta", locale));
}

export async function cancelOwnPledgeAction(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const { cancelOwnPledge } =
    await import("@/src/application/accounts/cancel-own-pledge");
  const result = await cancelOwnPledge(
    await getAccountDeps(),
    textOf(formData, "pledgeId"),
  );

  if (result.status === "error") {
    redirect(
      `${localizeHref("/cuenta", locale)}?aviso=${encodeURIComponent(result.code)}`,
    );
  }

  revalidatePath(localizeHref("/catalogo", locale));
  revalidatePath(localizeHref("/cuenta", locale));
  redirect(localizeHref("/cuenta", locale));
}

export type { AccountFormState };
export type ClaimLocale = Locale;
