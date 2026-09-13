"use client";

import { useActionState } from "react";

import { requestPasswordReset, setPassword } from "@/app/(es)/cuenta/actions";
import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import type { AccountContent } from "@/content/schema";
import type { Locale } from "@/src/i18n/locale";

import { fieldError, generalError } from "./error-text";
import { FormError, LocaleField, SubmitButton, TextField } from "./fields";

/**
 * Las dos mitades de recuperar el acceso: pedir el enlace y fijar la contraseña.
 *
 * La primera contesta lo mismo exista o no la cuenta, **y lo dice**. Un "listo"
 * seco sería indistinguible de un oráculo que confirma qué direcciones están
 * registradas en el sitio; el texto de `cuenta.json` explica por qué la respuesta
 * es siempre la misma, y hay un test de contenido que verifica que lo siga
 * explicando.
 */

function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}

export function RecoverForm({
  copy,
  errors,
  fields,
  locale,
}: {
  copy: AccountContent["recover"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    requestPasswordReset,
    IDLE,
  );

  if (state.phase === "done") {
    return (
      <div className="max-w-measure border-t border-rule pt-lg">
        <p className="font-ui text-subheading text-ink">{copy.sentTitle}</p>
        {copy.sentBody.map((text) => (
          <p key={text.slice(0, 32)} className="mt-sm text-body text-ink-muted">
            {text}
          </p>
        ))}
      </div>
    );
  }

  const general = generalError(state, errors);

  return (
    <form action={formAction} className="max-w-measure space-y-lg">
      <LocaleField locale={locale} />

      <TextField
        name="email"
        type="email"
        label={fields.email}
        autoComplete="username"
        {...optional(fieldError(state, errors, "email"))}
      />

      {general === null ? null : <FormError>{general}</FormError>}

      <SubmitButton pendingLabel={copy.submitting}>{copy.submit}</SubmitButton>
    </form>
  );
}

export function PasswordForm({
  copy,
  errors,
  fields,
  locale,
}: {
  copy: AccountContent["password"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    setPassword,
    IDLE,
  );

  const general = generalError(state, errors);

  return (
    <form action={formAction} className="max-w-measure space-y-lg">
      <LocaleField locale={locale} />

      <TextField
        name="password"
        type="password"
        label={fields.newPassword}
        hint={fields.passwordHint}
        autoComplete="new-password"
        {...optional(fieldError(state, errors, "password"))}
      />

      {/* Repetir la contraseña no es ceremonia: acá no hay forma de darse cuenta de
          un error de tipeo hasta el próximo intento de entrar, y para entonces el
          único camino de vuelta es pedir otro enlace por correo. */}
      <TextField
        name="confirmacion"
        type="password"
        label={fields.confirmPassword}
        autoComplete="new-password"
        {...optional(fieldError(state, errors, "confirmPassword"))}
      />

      {general === null ? null : <FormError>{general}</FormError>}

      <SubmitButton pendingLabel={copy.submitting}>{copy.submit}</SubmitButton>
    </form>
  );
}
