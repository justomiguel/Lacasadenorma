import { localizeHref, type Locale } from "@/src/i18n/locale";

import { safeAccountReturn } from "./return-path";

/**
 * A dónde manda `/cuenta/oauth` cuando el canje terminó, o cuando no.
 *
 * El destino **no viene de la query**. Un `next` que se respeta sin validar es
 * un redirect abierto: alguien que acaba de autorizar Google —o sea, alguien
 * predispuesto a confiar— aterrizaría en una pantalla ajena. Es la misma
 * lección que `/cuenta/confirmar`.
 *
 * El único destino extra que se acepta es el que `safeAccountReturn` ya
 * filtra (el catálogo), y llega en una cookie que puso la acción, no en la URL
 * del callback.
 */

export type OAuthNotice = "oauthFailed" | "oauthNoEmail";

/** Cookie httpOnly con la vuelta al catálogo. No viaja en la URL del callback. */
export const OAUTH_RETURN_COOKIE = "cuenta-volver";

/** Diez minutos: alcanza para confirmar el correo o volver de la red. */
export const ACCOUNT_RETURN_MAX_AGE = 10 * 60;

export function oauthSuccessPath(locale: Locale, returnTo: string | undefined): string {
  return safeAccountReturn(returnTo, locale);
}

export function oauthFailurePath(locale: Locale, notice: OAuthNotice): string {
  return `${localizeHref("/cuenta/ingresar", locale)}?aviso=${notice}`;
}

/**
 * Después de canjear el enlace del correo.
 *
 * Recuperar va a poner la contraseña. Confirmar (y el resto) va al catálogo si
 * la persona venía de una ficha, y si no a `/cuenta`. El destino **no** sale
 * de la query del enlace.
 */
export function pathAfterEmailConfirm(
  type: "signup" | "email" | "email_change" | "recovery" | "invite",
  locale: Locale,
  returnTo: string | undefined,
): string {
  if (type === "recovery") {
    return localizeHref("/cuenta/clave", locale);
  }

  return safeAccountReturn(returnTo, locale);
}
