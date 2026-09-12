import type { Route } from "next";

import { localizeHref, type Locale } from "./locale";

/**
 * La ruta tipada que `<Link>` acepta.
 *
 * `localizeHref` devuelve `string` porque el prefijo `/en` no está en el mapa
 * de rutas hasta que existen los archivos. El aserto es el puente: las rutas
 * canónicas (`/norma`) son las que el árbol declara, y el prefijo es el idioma,
 * no un slug inventado.
 */
export function localizedHref(path: string, locale: Locale): Route {
  return localizeHref(path, locale) as Route;
}
