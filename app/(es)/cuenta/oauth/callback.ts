import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import {
  OAUTH_RETURN_COOKIE,
  oauthFailurePath,
  oauthSuccessPath,
} from "@/src/application/accounts/oauth-result";
import { getOwnAccount } from "@/src/application/accounts/own-account";
import { localizeHref, type Locale } from "@/src/i18n/locale";
import { accountDepsForClient } from "@/src/infrastructure/accounts/context";
import { logger } from "@/src/infrastructure/logging/logger";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server-client";

/**
 * El destino va **sin origen**, igual que `/cuenta/confirmar`.
 *
 * Un `Location` relativo lo resuelve el navegador contra la barra. Armar una
 * URL absoluta con `request.nextUrl.origin` manda a otro host (medido:
 * `127.0.0.1` vs `localhost`) y deja atrás la cookie de sesión. `303` y
 * `no-store`: el canje ya ocurrió, y la respuesta lleva la cookie puesta.
 */
function goTo(path: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

const RETURN_COOKIE = OAUTH_RETURN_COOKIE;

/**
 * El salto de vuelta de la red, canjeado por una sesión.
 *
 * **Por qué no se respeta el `next` de la query.** Es el patrón que la
 * documentación de Auth muestra, y tal cual está es un redirect abierto:
 * alguien que acaba de autorizar Google —predispuesto a confiar— aterrizaría
 * en una pantalla ajena. El destino lo decide este archivo: `/cuenta`, o el
 * catálogo si la acción dejó esa vuelta en la cookie.
 *
 * Sin correo en la sesión que acaba de abrir, se cierra y se manda a
 * ingresar. Una reserva se confirma por correo; una cuenta sin dirección no
 * sirve (ADR-039).
 */
export async function completeOAuth(
  request: NextRequest,
  locale: Locale,
): Promise<NextResponse> {
  const failed = oauthFailurePath(locale, "oauthFailed");
  const params = request.nextUrl.searchParams;
  const code = params.get("code");

  if (params.get("error") !== null || code === null || code.length === 0) {
    return goTo(failed);
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return goTo(`${localizeHref("/cuenta/ingresar", locale)}?aviso=notConfigured`);
  }

  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error !== null) {
    logger.warn("Canje OAuth rechazado", { code: error.code });

    return goTo(failed);
  }

  const email = data.user.email?.trim() ?? "";

  if (email.length === 0) {
    await client.auth.signOut();

    return goTo(oauthFailurePath(locale, "oauthNoEmail"));
  }

  try {
    // El mismo cliente que acaba de canjear: uno nuevo podría no ver todavía
    // la cookie que se acaba de escribir, y el nombre de la red se perdería.
    await getOwnAccount(accountDepsForClient(client), locale);
  } catch (error) {
    logger.error("No se pudo copiar el perfil de la red", { error });
  }

  const cookieStore = await cookies();
  const returnTo = cookieStore.get(RETURN_COOKIE)?.value;
  cookieStore.delete(RETURN_COOKIE);

  return goTo(oauthSuccessPath(locale, returnTo));
}
