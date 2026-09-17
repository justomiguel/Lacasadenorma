"use client";

import { useActionState, useEffect, useRef } from "react";

import { startDonateAction } from "@/app/(es)/catalogo/actions";
import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import {
  FormError,
  LocaleField,
  SubmitButton,
  TextField,
} from "@/components/account/fields";
import { fieldError, generalError } from "@/components/account/error-text";
import type { AccountContent, CatalogContent } from "@/content/schema";
import type { Locale } from "@/src/i18n/locale";

import { captureFirstInvalid, revealFormError } from "./reveal-invalid";
import { OfferThanksNotice } from "./offer-thanks";

/**
 * El primer paso de traer un bien (ADR-051): nombre y teléfono o correo.
 *
 * El HTML público es éste, también con sesión. El correo sin sesión abre
 * `/cuenta/crear`. Con sesión, reserva en ese POST. El teléfono reserva
 * a nombre de esa persona, con o sin cuenta.
 */
export function OfferForm({
  itemId,
  copy,
  account,
  locale,
}: {
  itemId: string;
  copy: CatalogContent;
  account: AccountContent;
  locale: Locale;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    startDonateAction,
    IDLE,
  );
  const form = useRef<HTMLFormElement>(null);
  const channelError = fieldError(state, account.errors, "contactChannel");
  const general = generalError(state, account.errors) ?? channelError ?? null;

  useEffect(() => {
    if (state.phase !== "error") {
      return;
    }

    revealFormError(form.current);
  }, [state]);

  if (state.phase === "done") {
    return <OfferThanksNotice copy={copy} className="mt-lg" />;
  }

  return (
    <form
      ref={form}
      action={formAction}
      aria-label={copy.donateCta}
      className="mt-lg max-w-measure space-y-lg"
      onInvalidCapture={captureFirstInvalid}
    >
      <LocaleField locale={locale} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="canal" value="bring" />

      <TextField
        name="contacto"
        label={copy.contactName}
        hint={copy.contactNameHint}
        autoComplete="name"
        {...optional(fieldError(state, account.errors, "contactName"))}
      />

      <TextField
        name="telefono"
        label={copy.contactPhone}
        hint={copy.contactPhoneHint}
        required={false}
        autoComplete="tel"
        inputMode="tel"
        {...optional(fieldError(state, account.errors, "contactPhone"))}
      />

      <TextField
        name="correo"
        type="email"
        label={copy.contactEmail}
        hint={copy.contactEmailHint}
        required={false}
        autoComplete="email"
        {...optional(fieldError(state, account.errors, "email"))}
      />

      <p className="font-ui text-small text-ink-muted">{copy.contactChannelHint}</p>

      {general === null ? null : <FormError>{general}</FormError>}

      <SubmitButton pendingLabel={copy.coverClaiming}>{copy.donateCta}</SubmitButton>
    </form>
  );
}

function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}
