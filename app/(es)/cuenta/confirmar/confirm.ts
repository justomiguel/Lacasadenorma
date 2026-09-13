import { NextResponse, type NextRequest } from "next/server";

import { localizeHref, type Locale } from "@/src/i18n/locale";
import { logger } from "@/src/infrastructure/logging/logger";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server-client";

/**
 * El destino va **sin origen**, y eso es lo que hace que la sesión sobreviva.
 *
 * Un `Location` relativo lo resuelve el navegador contra la dirección que tiene en
 * la barra, así que la respuesta no puede mandar a nadie a otro origen que el que
 * ya estaba usando. La alternativa —armar una URL absoluta— tiene dos formas y las
 * dos están mal:
 *
 * - Con `request.nextUrl.origin` o `request.url`: en Next 16 **no son la dirección
 *   que pidió el navegador**, son la del servidor. Medido: un pedido a
 *   `http://127.0.0.1:3211/…` los devuelve como `http://localhost:3211`. La cookie
 *   de sesión que `verifyOtp` acaba de escribir es de host, así que el redirect la
 *   deja atrás y la persona confirma su cuenta y aterriza sin sesión.
 * - Con la cabecera `Host`: es del cliente, y construir un redirect con ella es
 *   inyección de host.
 *
 * `303` y no `307`: el canje del token ya ocurrió, y lo que sigue es ir a ver el
 * resultado en otro lado. Es exactamente lo que significa "See Other".
 *
 * `no-store` porque la respuesta lleva la cookie de sesión puesta: sin eso, un
 * intermediario podría guardarla y servírsela a otra persona, que es la misma
 * falla que `proxy.ts` evita en cada navegación.
 */
function goTo(path: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

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

  const expired = `${localizeHref("/cuenta/ingresar", locale)}?aviso=linkExpired`;

  if (tokenHash === null || tokenHash.length === 0 || !isKnownType(type)) {
    return goTo(expired);
  }

  const client = await createServerSupabaseClient();

  if (client === null) {
    return goTo(expired);
  }

  const { error } = await client.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error !== null) {
    // Un token vencido, uno ya usado y uno inventado se ven igual desde acá, y
    // contestar lo mismo en los tres casos es lo correcto: la diferencia le diría a
    // quien prueba enlaces al azar cuándo acertó la forma.
    logger.warn("Enlace de correo rechazado", { code: error.code });

    return goTo(expired);
  }

  // La cookie de sesión la escribió `verifyOtp` a través del almacén de cookies del
  // request, y el redirect la lleva puesta.
  return goTo(localizeHref(type === "recovery" ? "/cuenta/clave" : "/cuenta", locale));
}
