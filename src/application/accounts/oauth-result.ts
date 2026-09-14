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

export function oauthSuccessPath(locale: Locale, returnTo: string | undefined): string {
  return safeAccountReturn(returnTo, locale);
}

export function oauthFailurePath(locale: Locale, notice: OAuthNotice): string {
  return `${localizeHref("/cuenta/ingresar", locale)}?aviso=${notice}`;
}
