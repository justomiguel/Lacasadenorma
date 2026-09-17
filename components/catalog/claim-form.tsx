"use client";

import { useActionState, useEffect, useRef } from "react";

import { claimItemAction } from "@/app/(es)/catalogo/actions";
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

/**
 * Anotarse a traer un bien, con sesión: un clic reserva y avisa al owner
 * (`staff.new_pledge`). No se pide nombre ni dirección: la cuenta ya dice
 * quién es (ADR-051). El HTML público no es éste.
 */
export function ClaimForm({
  itemId,
  remaining,
  copy,
  account,
  locale,
  submitLabel,
  pendingLabel,
}: {
  itemId: string;
  remaining: number;
  copy: CatalogContent;
  account: AccountContent;
  locale: Locale;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    claimItemAction,
    IDLE,
  );
  const form = useRef<HTMLFormElement>(null);
  const general = generalError(state, account.errors);
  const label = submitLabel ?? copy.claim;

  useEffect(() => {
    if (state.phase !== "error") {
      return;
    }

    revealFormError(form.current);
  }, [state]);

  return (
    <form
      ref={form}
      action={formAction}
      aria-label={label}
      className="mt-lg max-w-measure space-y-lg"
      onInvalidCapture={captureFirstInvalid}
    >
      <LocaleField locale={locale} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="canal" value="bring" />

      {remaining > 1 ? (
        <TextField
          name="cantidad"
          label={copy.quantity}
          required
          inputMode="numeric"
          defaultValue="1"
          {...optional(fieldError(state, account.errors, "quantity"))}
        />
      ) : (
        <input type="hidden" name="cantidad" value="1" />
      )}

      {general === null ? null : <FormError>{general}</FormError>}

      <SubmitButton pendingLabel={pendingLabel ?? copy.claiming}>{label}</SubmitButton>
    </form>
  );
}

function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}
