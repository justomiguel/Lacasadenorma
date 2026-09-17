"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DONATE_INTENT_COOKIE,
  DONATE_INTENT_MAX_AGE,
  serializeDonateIntent,
} from "@/src/application/accounts/donate-intent";
import {
  catalogItemHref,
  CATALOG_ITEM_ID,
  accountHref,
} from "@/src/application/accounts/return-path";
import { claimItem } from "@/src/application/use-cases/claim-item";
import { offerItemByPhone } from "@/src/application/use-cases/offer-item-by-phone";
import { parseDonateStart } from "@/src/domain/donate-start";
import { isCoverChannel } from "@/src/domain/cover";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";
import { notifyPhoneOffer } from "@/src/infrastructure/donations/notify-offer";
import { notifyPledgeClaimed } from "@/src/infrastructure/donations/notify";
import { logger } from "@/src/infrastructure/logging/logger";
import { createOffersPort } from "@/src/infrastructure/supabase/offers-port";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server-client";
import { localizeHref, type Locale } from "@/src/i18n/locale";

import { failure, localeOf, textOf, type AccountFormState } from "../cuenta/form-state";
import { revalidateDonationPages } from "../revalidate-donations";

/**
 * El primer paso de traer un bien (ADR-051): nombre y teléfono o correo.
 *
 * El correo abre `/cuenta/crear` con el mail en cookie, no en la URL. El
 * teléfono reserva a nombre de esa persona y manda `staff.phone_offer` con
 * un botón de WhatsApp y dos enlaces. Sin sesión es el camino público; con
 * sesión el HTML hidratado ya muestra el de retiro.
 */
export async function startDonateAction(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const itemId = textOf(formData, "itemId");
  const catalog = localizeHref("/catalogo", locale);
  const ficha = CATALOG_ITEM_ID.test(itemId) ? catalogItemHref(itemId, locale) : catalog;
  const start = parseDonateStart({
    name: textOf(formData, "contacto"),
    email: textOf(formData, "correo"),
    phone: textOf(formData, "telefono"),
  });

  if (start.status === "error") {
    return start.field === "contactName"
      ? failure("contactNameRequired", "contactName")
      : start.field === "email"
        ? failure("emailInvalid", "email")
        : start.field === "contactPhone"
          ? failure("phoneInvalid", "contactPhone")
          : failure("contactChannelRequired", "contactChannel");
  }

  if (!CATALOG_ITEM_ID.test(itemId)) {
    return failure("failed");
  }

  if (start.value.channel === "email") {
    const cookieStore = await cookies();

    cookieStore.set(
      DONATE_INTENT_COOKIE,
      serializeDonateIntent({
        itemId,
        name: start.value.name,
        email: start.value.email,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: DONATE_INTENT_MAX_AGE,
      },
    );

    redirect(accountHref("crear", locale, ficha));
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return failure("notConfigured");
  }

  const result = await offerItemByPhone(
    {
      offers: createOffersPort(client),
      logger,
      afterOffer: notifyPhoneOffer,
    },
    {
      itemId,
      contactName: start.value.name,
      contactPhone: start.value.phone,
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

  revalidateDonationPages();
  redirect(`${ficha}?reservado=1#gracias`);
}

/**
 * Anotarse a traer un ítem, con sesión.
 *
 * El formulario de retiro aparece al hidratar. Un POST sin sesión —el HTML
 * público no es éste— redirige a crear una cuenta con `volver` a la ficha.
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
