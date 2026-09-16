"use client";

import { useActionState } from "react";

import { signIn, signUp } from "@/app/(es)/cuenta/actions";
import { IDLE, type AccountFormState } from "@/app/(es)/cuenta/form-state";
import type { AccountContent } from "@/content/schema";
import type { SocialProviderId } from "@/src/domain/auth/social-providers";
import type { Locale } from "@/src/i18n/locale";

import { fieldError, generalError } from "./error-text";
import { FormError, LocaleField, SubmitButton, TextField } from "./fields";
import { SocialAuth } from "./social-auth";

/**
 * Los dos formularios de credenciales.
 *
 * Reciben el texto por props porque `content/index.ts` es `server-only` y esto
 * corre en el navegador: la página, que es un Server Component, lee el contenido y
 * baja el pedazo que hace falta. Es la frontera que ADR-022 tuvo que medir para
 * descubrir, y el motivo de que no se pueda "simplificar" importando el contenido
 * acá.
 *
 * `autoComplete` está puesto en los cuatro campos a propósito. Un gestor de
 * contraseñas que funciona es la diferencia entre una contraseña larga y una que
 * alguien se pueda acordar, y en un teléfono es la diferencia entre entrar y
 * desistir.
 */

export function SignUpForm({
  copy,
  errors,
  fields,
  locale,
  providers,
  returnTo,
  social,
  emailPrefill,
}: {
  copy: AccountContent["signUp"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
  providers: readonly SocialProviderId[];
  returnTo?: string | null;
  social: AccountContent["social"];
  emailPrefill?: string | null;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(signUp, IDLE);

  // Registrarse no abre sesión: la abre el enlace del correo. El formulario
  // desaparece en lugar de quedar debajo del aviso, porque volver a enviarlo no es
  // lo que corresponde hacer ahora (contrato de cuentas).
  if (state.phase === "done") {
    return (
      // Un `h2` y no un párrafo con pinta de título: el formulario desaparece y lo
      // que queda es el resultado, así que quien recorre la página por encabezados
      // —que es cómo se navega con un lector de pantalla— tiene que encontrarlo.
      <div className="max-w-measure border-t border-rule pt-lg">
        <h2 className="font-ui text-subheading text-ink">{copy.checkInboxTitle}</h2>
        {copy.checkInboxBody.map((text) => (
          <p key={text.slice(0, 32)} className="mt-sm text-body text-ink-muted">
            {text}
          </p>
        ))}
      </div>
    );
  }

  const general = generalError(state, errors);

  return (
    <>
      <form action={formAction} className="max-w-measure space-y-lg">
        <LocaleField locale={locale} />
        {returnTo === null || returnTo === undefined || returnTo.length === 0 ? null : (
          <input type="hidden" name="volver" value={returnTo} />
        )}

        <TextField
          name="email"
          type="email"
          label={fields.email}
          autoComplete="username"
          {...(emailPrefill === undefined ||
          emailPrefill === null ||
          emailPrefill.length === 0
            ? {}
            : { defaultValue: emailPrefill })}
          {...optional(fieldError(state, errors, "email"))}
        />

        <TextField
          name="password"
          type="password"
          label={fields.password}
          hint={fields.passwordHint}
          autoComplete="new-password"
          {...optional(fieldError(state, errors, "password"))}
        />

        {general === null ? null : <FormError>{general}</FormError>}

        <SubmitButton pendingLabel={copy.submitting}>{copy.submit}</SubmitButton>
      </form>
      <SocialAuth
        copy={social}
        errors={errors}
        locale={locale}
        providers={providers}
        returnTo={returnTo ?? null}
      />
    </>
  );
}

export function SignInForm({
  copy,
  errors,
  fields,
  locale,
  notice,
  providers,
  returnTo,
  social,
}: {
  copy: AccountContent["signIn"];
  errors: AccountContent["errors"];
  fields: AccountContent["fields"];
  locale: Locale;
  /** El aviso con el que llega quien vino de un enlace vencido. */
  notice: string | null;
  providers: readonly SocialProviderId[];
  /** Destino post-ingreso. Vacío cae en `/cuenta`. */
  returnTo?: string | null;
  social: AccountContent["social"];
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(signIn, IDLE);

  const general = generalError(state, errors) ?? (state.phase === "idle" ? notice : null);

  return (
    <>
      <form action={formAction} className="max-w-measure space-y-lg">
        <LocaleField locale={locale} />
        {returnTo === null || returnTo === undefined || returnTo.length === 0 ? null : (
          <input type="hidden" name="volver" value={returnTo} />
        )}

        <TextField
          name="email"
          type="email"
          label={fields.email}
          autoComplete="username"
          {...optional(fieldError(state, errors, "email"))}
        />

        <TextField
          name="password"
          type="password"
          label={fields.password}
          autoComplete="current-password"
          {...optional(fieldError(state, errors, "password"))}
        />

        {general === null ? null : <FormError>{general}</FormError>}

        <SubmitButton pendingLabel={copy.submitting}>{copy.submit}</SubmitButton>
      </form>
      <SocialAuth
        copy={social}
        errors={errors}
        locale={locale}
        providers={providers}
        returnTo={returnTo ?? null}
      />
    </>
  );
}

/**
 * `exactOptionalPropertyTypes` no acepta una prop opcional con `undefined`
 * explícito, y lo que devuelve `fieldError` es exactamente eso. Esto convierte la
 * ausencia en la única forma que el tipo admite: la prop que no está.
 */
function optional(error: string | undefined): { error?: string } {
  return error === undefined ? {} : { error };
}
