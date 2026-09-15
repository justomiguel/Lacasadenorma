"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

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
import { cn } from "@/components/design-system/cn";
import type { AccountContent, CatalogContent } from "@/content/schema";
import type { Locale } from "@/src/i18n/locale";

/**
 * Anotarse a traer un bien: nombre, teléfono optativo y dirección de retiro
 * (ADR-046). La cuenta no es la prueba: es para ver y cancelar.
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
  const general = generalError(state, account.errors);
  const label = submitLabel ?? copy.claim;

  return (
    <form
      action={formAction}
      aria-label={label}
      className="mt-lg max-w-measure space-y-lg"
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

      <TextField
        name="contacto"
        label={copy.contactName}
        hint={copy.contactNameHint}
        required={false}
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

      <AddressField
        copy={copy}
        error={fieldError(state, account.errors, "pickupAddress")}
      />

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

      {general === null ? null : <FormError>{general}</FormError>}

      <SubmitButton pendingLabel={pendingLabel ?? copy.claiming}>{label}</SubmitButton>
    </form>
  );
}

function AddressField({
  copy,
  error,
}: {
  copy: CatalogContent;
  error: string | undefined;
}) {
  const { pending } = useFormStatus();
  const id = useId();
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const describedBy = [hintId, error === undefined ? null : errorId]
    .filter((value) => value !== null)
    .join(" ");

  return (
    <div className="space-y-2xs">
      <label htmlFor={id} className="block font-ui text-small font-medium text-ink">
        {copy.pickupAddress}
      </label>
      <textarea
        id={id}
        name="direccion"
        rows={3}
        autoComplete="street-address"
        disabled={pending}
        aria-describedby={describedBy}
        {...(error === undefined ? {} : { "aria-invalid": true })}
        className={cn(
          "w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body text-ink",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          "aria-invalid:border-danger disabled:opacity-60",
        )}
      />
      <p id={hintId} className="font-ui text-small text-ink-muted">
        {copy.pickupAddressHint}
      </p>
      {error === undefined ? null : (
        <p id={errorId} className="font-ui text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}
