"use client";

import { useActionState } from "react";

import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import { deleteAccount, updateProfile } from "@/app/(es)/cuenta/profile-actions";
import { CheckIcon, TrashIcon } from "@/components/design-system/icons";
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
 * Los dos formularios están en el mismo archivo porque pertenecen a la misma
 * cuenta: el que decide cómo aparecer y el que se va del todo. Cerrar sesión
 * vive en el chrome, no acá.
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
        <SubmitButton icon={<CheckIcon />} pendingLabel={copy.saving}>
          {copy.save}
        </SubmitButton>
        {state.phase === "done" ? (
          <p role="status" className="font-ui text-small text-success">
            {copy.saved}
          </p>
        ) : null}
      </div>
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

      <SubmitButton icon={<TrashIcon />} tone="danger" pendingLabel={copy.deleting}>
        {copy.delete}
      </SubmitButton>
    </form>
  );
}
