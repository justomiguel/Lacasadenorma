"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AccountErrorCode } from "@/src/application/accounts/outcome";
import {
  ACCOUNT_RETURN_MAX_AGE,
  OAUTH_RETURN_COOKIE,
} from "@/src/application/accounts/oauth-result";
import { localizeHref, type Locale } from "@/src/i18n/locale";
import { logger } from "@/src/infrastructure/logging/logger";
import { registerPublicAccount } from "@/src/infrastructure/accounts/register";
import { getSiteUrl } from "@/src/infrastructure/site-url";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server-client";

import { safeAccountReturn } from "@/src/application/accounts/return-path";

import {
  credentials,
  localeOf,
  rateLimited,
  textOf,
  type AccountFormState,
} from "./form-state";

/**
 * Las acciones de identidad: crear la cuenta, entrar, salir, y las dos mitades de
 * recuperar el acceso.
 *
 * Tres decisiones que son de seguridad y no de estilo, y las tres tienen la misma
 * forma —**contestar menos**—:
 *
 * **1. `signIn` no dice cuál de los dos campos falló.** Distinguir "esa dirección
 * no está registrada" de "la contraseña está mal" convierte el formulario en un
 * verificador de correos registrados en el sitio, que es información útil para
 * quien está probando credenciales robadas (amenaza S1). Es la misma decisión que
 * ya estaba tomada en `/admin/login`.
 *
 * **2. `requestPasswordReset` contesta lo mismo exista o no la cuenta.** Por lo
 * mismo, y más fuerte: acá el formulario es público. La pantalla además **explica**
 * por qué contesta así, porque un "listo" seco es indistinguible de un oráculo.
 *
 * **3. `signUp` no inicia sesión.** Con `enable_confirmations = true` no puede: la
 * sesión aparece cuando se abre el enlace del correo. Eso es lo que hace que tener
 * sesión implique correo confirmado, y de eso depende no tener que verificarlo en
 * ningún otro lado (contrato de cuentas, amenaza S3).
 *
 * El correo nunca se escribe en un log. El logger lo redactaría igual, y de todos
 * modos el dato que sirve para diagnosticar es que hubo un intento fallido.
 */

/** Ocho caracteres es el default de GoTrue, y se repite acá para poder decirlo antes. */
const MIN_PASSWORD_LENGTH = 8;

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface Credentials {
  readonly email: string;
  readonly password: string;
  readonly locale: Locale;
}

function readCredentials(
  formData: FormData,
  requirePassword: boolean,
): Credentials | AccountFormState {
  const email = textOf(formData, "email").trim();
  const password = textOf(formData, "password");
  const locale = localeOf(formData);

  if (!EMAIL_SHAPE.test(email)) {
    return { phase: "error", code: "emailInvalid", field: "email" };
  }

  if (requirePassword && password.length < MIN_PASSWORD_LENGTH) {
    return { phase: "error", code: "passwordShort", field: "password" };
  }

  return { email, password, locale };
}

function isState(value: unknown): value is AccountFormState {
  return typeof value === "object" && value !== null && "phase" in value;
}

/**
 * El enlace del correo apunta al idioma en el que la persona estaba.
 *
 * Esta URL tiene que estar en `auth.site_url` o en `additional_redirect_urls` del
 * proyecto, incluidas las de preview de Vercel. Si no está, GoTrue manda el enlace
 * a la home y la persona ve el sitio sin ninguna explicación de por qué su cuenta
 * no quedó confirmada (`research.md` §3).
 */
function confirmationUrl(locale: Locale): string {
  return `${getSiteUrl()}${localizeHref("/cuenta/confirmar", locale)}`;
}

function authFailure(
  describe: string,
  error: { status?: number | undefined; code?: string | undefined },
  fallback: AccountErrorCode,
): AccountFormState {
  if (error.status === 429 || (error.code ?? "").includes("rate_limit")) {
    return rateLimited();
  }

  if (error.code === "weak_password") {
    return { phase: "error", code: "passwordShort", field: "password" };
  }

  logger.warn(`No se pudo ${describe}`, { code: error.code, status: error.status });

  return { phase: "error", code: fallback, field: null };
}

export async function signUp(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = readCredentials(formData, true);

  if (isState(parsed)) {
    return parsed;
  }

  await rememberAccountReturn(textOf(formData, "volver"), parsed.locale);

  const registered = await registerPublicAccount({
    email: parsed.email,
    password: parsed.password,
    locale: parsed.locale,
  });

  if (!registered.ok) {
    if (registered.error.code === "notConfigured") {
      return { phase: "error", code: "notConfigured", field: null };
    }

    return authFailure("crear la cuenta", registered.error, "failed");
  }

  // `done` y no un redirect: lo que sigue no es una pantalla nueva sino la misma
  // diciendo que hay que abrir el correo. Y si la dirección ya tenía cuenta,
  // Supabase contesta exactamente igual —sin identidades nuevas— para no revelarlo;
  // mostrar otra cosa acá desharía esa protección.
  return { phase: "done" };
}

async function rememberAccountReturn(candidate: string, locale: Locale): Promise<void> {
  const safe = safeAccountReturn(candidate, locale);

  if (safe === localizeHref("/cuenta", locale)) {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(OAUTH_RETURN_COOKIE, safe, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCOUNT_RETURN_MAX_AGE,
  });
}

export async function signIn(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = readCredentials(formData, false);

  if (isState(parsed)) {
    return parsed;
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return { phase: "error", code: "notConfigured", field: null };
  }

  const { error } = await client.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error !== null) {
    if (error.status === 429) {
      return rateLimited();
    }

    logger.warn("Intento de acceso fallido a una cuenta del público", {
      code: error.code,
    });

    return credentials();
  }

  redirect(safeAccountReturn(textOf(formData, "volver"), parsed.locale));
}

/**
 * Recibe `FormData` y no el idioma como argumento aunque sólo necesite el idioma.
 * Una acción con argumento propio hay que atarla con `bind` en el cliente, y eso
 * la convierte en una referencia distinta por render; el campo oculto que ya
 * llevan todos los formularios de esta sección resuelve lo mismo sin eso.
 */
export async function signOut(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const client = await createServerSupabaseClient();

  if (client !== null) {
    await client.auth.signOut();
  }

  redirect(localizeHref("/cuenta/ingresar", locale));
}

export async function requestPasswordReset(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = readCredentials(formData, false);

  if (isState(parsed)) {
    return parsed;
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return { phase: "error", code: "notConfigured", field: null };
  }

  const { error } = await client.auth.resetPasswordForEmail(parsed.email, {
    redirectTo: confirmationUrl(parsed.locale),
  });

  // El límite de tasa **sí** se informa, y no contradice lo de arriba: es un estado
  // del proyecto, no un dato sobre esa dirección. Cualquier otro error se registra y
  // la pantalla contesta lo mismo que si hubiera salido bien.
  if (error !== null) {
    if (error.status === 429) {
      return rateLimited();
    }

    logger.warn("No se pudo mandar el correo de recuperación", { code: error.code });
  }

  return { phase: "done" };
}

export async function setPassword(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const password = textOf(formData, "password");
  const confirmation = textOf(formData, "confirmacion");
  const locale = localeOf(formData);

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { phase: "error", code: "passwordShort", field: "password" };
  }

  if (password !== confirmation) {
    return { phase: "error", code: "passwordMismatch", field: "confirmPassword" };
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return { phase: "error", code: "notConfigured", field: null };
  }

  // La sesión de recuperación la creó el enlace del correo, y sin ella esto no es
  // "cambiar la contraseña": es cambiarle la contraseña a nadie. Se comprueba acá y
  // no sólo al pintar la pantalla, porque una Server Action es un endpoint HTTP
  // invocable por su ID sin haber pasado por ninguna página (amenaza T7).
  const { data } = await client.auth.getClaims();

  if (typeof data?.claims.sub !== "string") {
    return { phase: "error", code: "noRecoverySession", field: null };
  }

  const { error } = await client.auth.updateUser({ password });

  if (error !== null) {
    return authFailure("cambiar la contraseña", error, "failed");
  }

  redirect(localizeHref("/cuenta", locale));
}

export async function changePassword(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const password = textOf(formData, "password");
  const confirmation = textOf(formData, "confirmacion");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { phase: "error", code: "passwordShort", field: "password" };
  }

  if (password !== confirmation) {
    return { phase: "error", code: "passwordMismatch", field: "confirmPassword" };
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return { phase: "error", code: "notConfigured", field: null };
  }

  const { data } = await client.auth.getClaims();

  if (typeof data?.claims.sub !== "string") {
    return { phase: "error", code: "noSession", field: null };
  }

  const { error } = await client.auth.updateUser({ password });

  if (error !== null) {
    return authFailure("cambiar la contraseña", error, "failed");
  }

  return { phase: "done" };
}
