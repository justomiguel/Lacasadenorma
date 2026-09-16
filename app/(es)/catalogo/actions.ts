"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  catalogItemHref,
  CATALOG_ITEM_ID,
  accountHref,
} from "@/src/application/accounts/return-path";
import { claimItem } from "@/src/application/use-cases/claim-item";
import { isCoverChannel } from "@/src/domain/cover";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";
import { notifyPledgeClaimed } from "@/src/infrastructure/donations/notify";
import { localizeHref, type Locale } from "@/src/i18n/locale";

import { failure, localeOf, textOf, type AccountFormState } from "../cuenta/form-state";

/**
 * Anotarse a traer un ítem.
 *
 * Sin sesión redirige a crear una cuenta con `volver` validado, para volver a
 * la ficha (US1 escenario 6). Quien ya tiene cuenta pasa a ingresar desde
 * esa pantalla, con la misma vuelta. Si alguien se adelantó, redirige a la
 * ficha con el aviso diseñado.
 */
export async function claimItemAction(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const itemId = textOf(formData, "itemId");
  const catalog = localizeHref("/catalogo", locale);
  const ficha = CATALOG_ITEM_ID.test(itemId) ? catalogItemHref(itemId, locale) : catalog;
  const deps = await getAccountDeps();

  if (deps.session.status === "anonymous") {
    redirect(accountHref("crear", locale, ficha));
  }

  const canal = textOf(formData, "canal");
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
      coverChannel: isCoverChannel(canal) ? canal : "bring",
      contactName: textOf(formData, "contacto"),
      contactPhone: textOf(formData, "telefono"),
      pickupAddress: textOf(formData, "direccion"),
    },
  );

  if (result.status === "error") {
    if (result.code === "ahead") {
      revalidatePath(catalog, "layout");
      revalidatePath(localizeHref("/catalogo", locale === "es" ? "en" : "es"), "layout");
      redirect(`${ficha}?conflicto=1`);
    }

    return failure(result.code, result.field);
  }

  revalidatePath(catalog, "layout");
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

  revalidatePath(localizeHref("/catalogo", locale), "layout");
  revalidatePath(localizeHref("/cuenta", locale));
  redirect(localizeHref("/cuenta", locale));
}

export type { AccountFormState };
export type ClaimLocale = Locale;
