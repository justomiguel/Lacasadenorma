"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";

import { claimItemAction } from "@/app/(es)/catalogo/actions";
import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import {
  CheckboxField,
  FormError,
  LocaleField,
  SubmitButton,
  TextField,
} from "@/components/account/fields";
import { fieldError, generalError } from "@/components/account/error-text";
import type { AccountContent, CatalogContent } from "@/content/schema";
import type { Locale } from "@/src/i18n/locale";

/**
 * El formulario para anotarse a traer un ítem.
 *
 * La casilla **concede** aparecer con nombre y viene destildada: el default es
 * no aparecer (FR-225). El nombre, si se escribe y la casilla no está marcada,
 * la función de la base lo descarta.
 */
export function ClaimForm({
  itemId,
  remaining,
  copy,
  account,
  locale,
  submitLabel,
  pendingLabel,
  children,
}: {
  itemId: string;
  remaining: number;
  copy: CatalogContent;
  account: AccountContent;
  locale: Locale;
  submitLabel?: string;
  pendingLabel?: string;
  children?: ReactNode;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    claimItemAction,
    IDLE,
  );
  const general = generalError(state, account.errors);

  return (
    <form action={formAction} className="mt-lg max-w-measure space-y-lg">
      <LocaleField locale={locale} />
      <input type="hidden" name="itemId" value={itemId} />

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

      <CheckboxField
        name="aparecer"
        label={copy.appearNamed}
        hint={copy.appearNamedHint}
        defaultChecked={false}
      />

      <TextField
        name="nombre"
        label={account.fields.displayName}
        hint={account.fields.displayNameHint}
        required={false}
        autoComplete="nickname"
        {...optional(fieldError(state, account.errors, "displayName"))}
      />

      <TextField name="nota" label={copy.note} hint={copy.noteHint} required={false} />

      {children}

      {general === null ? null : <FormError>{general}</FormError>}

      <SubmitButton pendingLabel={pendingLabel ?? copy.claiming}>
        {submitLabel ?? copy.claim}
      </SubmitButton>
    </form>
  );
}

function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}
