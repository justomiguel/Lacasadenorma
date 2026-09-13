import { NextResponse, type NextRequest } from "next/server";

import { localizeHref, type Locale } from "@/src/i18n/locale";
import { logger } from "@/src/infrastructure/logging/logger";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server-client";

/**
 * El enlace del correo, canjeado por una sesión.
 *
 * Es un route handler y no una página porque su trabajo entero es cambiar un token
 * por una cookie y mandar a la persona a otro lado. No tiene nada que mostrar, y
 * una página que redirige en su render es una página que parpadea.
 *
 * **Por qué no se respeta el `next` que venga en la query.** Es el patrón que la
 * documentación de Supabase muestra, y tal cual está es un redirect abierto: un
 * enlace `…/cuenta/confirmar?token_hash=…&next=https://sitio-parecido.example`
 * llevaría a alguien que acaba de confirmar su cuenta —o sea, alguien predispuesto
 * a confiar— a una pantalla de acceso ajena. Acá el destino **no viene de la
 * query**: lo decide el tipo de token, que es un dato del propio enlace firmado.
 *
 * `recovery` va a `/cuenta/clave` y todo lo demás a `/cuenta`. Son los dos únicos
 * destinos posibles, así que no hay lista que validar ni lista que se pueda quedar
 * corta.
 */

/** Los tipos de token que este sitio manda por correo. Cualquier otro se rechaza. */
const KNOWN_TYPES = ["signup", "email", "email_change", "recovery", "invite"] as const;

type KnownType = (typeof KNOWN_TYPES)[number];

function isKnownType(value: string | null): value is KnownType {
  return value !== null && (KNOWN_TYPES as readonly string[]).includes(value);
}

export async function confirmEmailLink(
  request: NextRequest,
  locale: Locale,
): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  const expired = new URL(request.nextUrl.origin);
  expired.pathname = localizeHref("/cuenta/ingresar", locale);
  expired.searchParams.set("aviso", "linkExpired");

  if (tokenHash === null || tokenHash.length === 0 || !isKnownType(type)) {
    return NextResponse.redirect(expired);
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return NextResponse.redirect(expired);
  }

  const { error } = await client.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error !== null) {
    // Un token vencido, uno ya usado y uno inventado se ven igual desde acá, y
    // contestar lo mismo en los tres casos es lo correcto: la diferencia le diría a
    // quien prueba enlaces al azar cuándo acertó la forma.
    logger.warn("Enlace de correo rechazado", { code: error.code });

    return NextResponse.redirect(expired);
  }

  const destination = new URL(request.nextUrl.origin);
  destination.pathname = localizeHref(
    type === "recovery" ? "/cuenta/clave" : "/cuenta",
    locale,
  );

  // La cookie de sesión la escribió `verifyOtp` a través del almacén de cookies del
  // request; el redirect la lleva puesta. `no-store` porque la respuesta acompaña
  // una credencial: sin eso, un intermediario podría guardarla y servírsela a otra
  // persona, que es la misma falla que `proxy.ts` evita en cada navegación.
  const response = NextResponse.redirect(destination);

  response.headers.set("Cache-Control", "no-store");

  return response;
}
