"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";

import {
  enabledSocialProviders,
  unknownSocialProviders,
} from "@/src/application/accounts/social-providers";
import { safeAccountReturn } from "@/src/application/accounts/return-path";
import { OAUTH_RETURN_COOKIE } from "@/src/application/accounts/oauth-result";
import { isSocialProvider, supabaseProviderOf } from "@/src/domain/auth/social-providers";
import { localizeHref } from "@/src/i18n/locale";
import { logger } from "@/src/infrastructure/logging/logger";
import { getSiteUrl } from "@/src/infrastructure/site-url";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server-client";

import { localeOf, rateLimited, textOf, type AccountFormState } from "./form-state";

/**
 * El salto a la red.
 *
 * No abre sesión acá: abre la URL de Auth, y la sesión aparece cuando
 * `/cuenta/oauth` canjea el código. Si el proveedor no está habilitado —un
 * envío manipulado, un id que alguien inventó— se contesta `oauthFailed` y no
 * se revela el catálogo.
 *
 * La vuelta al catálogo, si venía de ahí, viaja en una cookie httpOnly y no
 * en la URL del callback: un `next` en la query es un redirect abierto, y
 * ésta es la misma lección que `/cuenta/confirmar` (ADR-038).
 */

const RETURN_MAX_AGE = 10 * 60;

export async function startOAuth(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const requested = textOf(formData, "proveedor");
  const enabled = enabledSocialProviders();
  const unknown = unknownSocialProviders();

  if (unknown.length > 0) {
    logger.warn("AUTH_SOCIAL_PROVIDERS nombra algo que no está en el catálogo", {
      unknown,
    });
  }

  if (!isSocialProvider(requested) || !enabled.includes(requested)) {
    return { phase: "error", code: "oauthFailed", field: null };
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return { phase: "error", code: "notConfigured", field: null };
  }

  const { data, error } = await client.auth.signInWithOAuth({
    // El catálogo es un subconjunto de los Provider de Auth; GoTrue no acepta un
    // string suelto y el dominio no importa el paquete.
    provider: supabaseProviderOf(requested) as Provider,
    options: {
      redirectTo: `${getSiteUrl()}${localizeHref("/cuenta/oauth", locale)}`,
      skipBrowserRedirect: true,
    },
  });

  if (error !== null || data.url === null) {
    if (error?.status === 429 || (error?.code ?? "").includes("rate_limit")) {
      return rateLimited();
    }

    logger.warn("No se pudo armar el salto a la red", {
      code: error?.code,
      status: error?.status,
    });

    return { phase: "error", code: "oauthFailed", field: null };
  }

  const cookieStore = await cookies();

  cookieStore.set(
    OAUTH_RETURN_COOKIE,
    safeAccountReturn(textOf(formData, "volver"), locale),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: RETURN_MAX_AGE,
    },
  );

  redirect(data.url);
}
