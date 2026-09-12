import { localizeHref, type Locale } from "./locale";

/**
 * La ruta que `<Link>` acepta, con el prefijo de idioma aplicado.
 *
 * `localizeHref` es la función de verdad. Esta existe para que el call site
 * de un enlace no tenga que repetir el import de locale sólo por el tipo.
 */
export function localizedHref(path: string, locale: Locale) {
  return localizeHref(path, locale);
}
