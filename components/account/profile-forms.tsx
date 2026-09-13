"use client";

import { useActionState } from "react";

import { signOut } from "@/app/(es)/cuenta/actions";
import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import { deleteAccount, updateProfile } from "@/app/(es)/cuenta/profile-actions";
import type { AccountContent } from "@/content/schema";
import type { DonorProfile } from "@/src/domain/entities/donor";
import type { Locale } from "@/src/i18n/locale";

import { fieldError, generalError } from "./error-text";
import {
  CheckboxField,
  FormError,
  LocaleField,
  RadioField,
  SubmitButton,
  TextField,
} from "./fields";

/**
 * Lo que una persona puede hacer con su propia cuenta desde el sitio.
 *
 * Los tres formularios están en el mismo archivo porque comparten pantalla y
 * ninguno tiene sentido sin los otros: el que decide cómo aparecer, el que cierra
 * la sesión y el que se va del todo. Separarlos en tres archivos escondería que la
 * pantalla es una sola decisión con tres salidas.
 */

function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}

export function ProfileForm({
  copy,
  errors,
  fields,
  locale,
  profile,
}: {
  copy: AccountContent["profile"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
  profile: DonorProfile;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    updateProfile,
    IDLE,
  );

  const general = generalError(state, errors);

  return (
    <form action={formAction} className="max-w-measure space-y-lg">
      <LocaleField locale={locale} />

      <TextField
        name="nombre"
        label={fields.displayName}
        hint={fields.displayNameHint}
        required={false}
        autoComplete="nickname"
        {...(profile.displayName === null ? {} : { defaultValue: profile.displayName })}
        {...optional(fieldError(state, errors, "displayName"))}
      />

      {/* La casilla dice "prefiero no aparecer" y no "quiero aparecer". Marcada es el
          estado por defecto, y una casilla marcada por defecto que **concede** algo
          es un consentimiento que nadie dio (FR-225, ADR-027). */}
      <CheckboxField
        name="anonimo"
        label={fields.anonymous}
        hint={fields.anonymousHint}
        defaultChecked={profile.defaultAnonymous}
      />

      <RadioField
        name="correoIdioma"
        legend={fields.language}
        value={profile.locale}
        options={[
          { value: "es", label: fields.languageEs },
          { value: "en", label: fields.languageEn },
        ]}
      />

      {general === null ? null : <FormError>{general}</FormError>}

      <div className="flex flex-wrap items-center gap-md">
        <SubmitButton pendingLabel={copy.saving}>{copy.save}</SubmitButton>
        {state.phase === "done" ? (
          <p role="status" className="font-ui text-small text-success">
            {copy.saved}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function SignOutForm({
  copy,
  locale,
}: {
  copy: AccountContent["profile"];
  locale: Locale;
}) {
  return (
    <form action={signOut}>
      <LocaleField locale={locale} />
      <button
        type="submit"
        className="min-h-touch font-ui text-small text-forest underline decoration-1 underline-offset-2 hover:text-forest-strong"
      >
        {copy.signOut}
      </button>
    </form>
  );
}

export function DeleteAccountForm({
  copy,
  errors,
  locale,
}: {
  copy: AccountContent["profile"];
  errors: AccountContent["errors"];
  locale: Locale;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    deleteAccount,
    IDLE,
  );

  const general = generalError(state, errors);

  return (
    <form action={formAction} className="max-w-measure space-y-lg">
      <LocaleField locale={locale} />

      <TextField
        name="confirmacion"
        label={`${copy.deleteConfirmLabel} ${copy.deleteWord}`}
        autoComplete="off"
      />

      {general === null ? null : <FormError>{general}</FormError>}

      <SubmitButton tone="danger" pendingLabel={copy.deleting}>
        {copy.delete}
      </SubmitButton>
    </form>
  );
}
