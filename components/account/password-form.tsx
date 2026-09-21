"use client";

import { useActionState } from "react";

import { changePassword } from "@/app/(es)/cuenta/actions";
import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import { CheckIcon } from "@/components/design-system/icons";
import type { AccountContent } from "@/content/schema";
import type { Locale } from "@/src/i18n/locale";

import { fieldError, generalError } from "./error-text";
import { FormError, LocaleField, SubmitButton, TextField } from "./fields";

function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}

export function ChangePasswordForm({
  copy,
  errors,
  fields,
  locale,
  saved,
}: {
  copy: AccountContent["password"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
  saved: string;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    changePassword,
    IDLE,
  );
  const general = generalError(state, errors);

  return (
    <form action={formAction} className="max-w-measure space-y-lg">
      <LocaleField locale={locale} />
      <TextField
        name="password"
        label={fields.newPassword}
        type="password"
        autoComplete="new-password"
        hint={fields.passwordHint}
        {...optional(fieldError(state, errors, "password"))}
      />
      <TextField
        name="confirmacion"
        label={fields.confirmPassword}
        type="password"
        autoComplete="new-password"
        {...optional(fieldError(state, errors, "confirmPassword"))}
      />
      {general === null ? null : <FormError>{general}</FormError>}
      <div className="flex flex-wrap items-center gap-md">
        <SubmitButton icon={<CheckIcon />} pendingLabel={copy.submitting}>
          {copy.submit}
        </SubmitButton>
        {state.phase === "done" ? (
          <p role="status" className="font-ui text-small text-success">
            {saved}
          </p>
        ) : null}
      </div>
    </form>
  );
}
