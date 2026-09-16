import { confirmationLink } from "@/src/application/emails/identity";
import { localizeHref, type Locale } from "@/src/i18n/locale";
import { logger } from "@/src/infrastructure/logging/logger";
import { getSiteUrl } from "@/src/infrastructure/site-url";
import { createAuthAdminClient } from "@/src/infrastructure/supabase/auth-admin";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server-client";

import { sendIdentityMail } from "../email/send-identity";
import { readSendEmailHookSecret } from "../email/webhook";

export type RegisterResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly error: { status?: number | undefined; code?: string | undefined };
    };

/**
 * Alta de una cuenta del público.
 *
 * Si hay clave secreta y el hook de Auth no está configurado, `generateLink`
 * crea la cuenta y Resend manda el correo (ADR-028). Si el hook sí está, Auth
 * llama a `/api/correo/identidad` y acá alcanza con `signUp`. Sin secreta —
 * el harness local— también es `signUp`, y el buzón lee el token de la base.
 */
export async function registerPublicAccount(input: {
  readonly email: string;
  readonly password: string;
  readonly locale: Locale;
}): Promise<RegisterResult> {
  const hookTakesOver = readSendEmailHookSecret() !== null;
  const admin = hookTakesOver ? null : createAuthAdminClient();

  if (admin !== null) {
    return registerWithResend(input);
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return { ok: false, error: { code: "notConfigured" } };
  }

  const { error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: confirmationRedirect(input.locale),
      data: { locale: input.locale },
    },
  });

  if (error !== null) {
    return { ok: false, error };
  }

  return { ok: true };
}

async function registerWithResend(input: {
  readonly email: string;
  readonly password: string;
  readonly locale: Locale;
}): Promise<RegisterResult> {
  const admin = createAuthAdminClient();

  if (admin === null) {
    return { ok: false, error: { code: "notConfigured" } };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: {
      redirectTo: confirmationRedirect(input.locale),
      data: { locale: input.locale },
    },
  });

  if (error !== null) {
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      return { ok: true };
    }

    return { ok: false, error };
  }

  const tokenHash = data.properties.hashed_token;
  const userId = data.user.id;

  if (tokenHash.length === 0) {
    logger.warn("generateLink no devolvió token_hash");

    return { ok: true };
  }

  const result = await sendIdentityMail("account.confirm", {
    userId,
    recipient: input.email,
    locale: input.locale,
    confirmUrl: confirmationLink(getSiteUrl(), input.locale, tokenHash, "signup"),
    tokenStamp: tokenHash.slice(0, 8),
  });

  if (result.status === "failed") {
    logger.error("Resend no mandó la confirmación de cuenta", { error: result.error });
  }

  return { ok: true };
}

function confirmationRedirect(locale: Locale): string {
  return `${getSiteUrl()}${localizeHref("/cuenta/confirmar", locale)}`;
}
