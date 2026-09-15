import { localizeHref, type Locale } from "@/src/i18n/locale";

/**
 * A dónde volver después de ingresar.
 *
 * Llega en la query como `volver`. Aceptar cualquier cadena sería un redirect
 * abierto: una URL con `volver=https://otro-sitio` convertiría la pantalla de
 * acceso en un trampolín para phishing.
 *
 * Sólo se acepta el catálogo, con un ítem opcional. El resto cae en `/cuenta`.
 * El ítem tiene que ser un UUID: cualquier otra cosa se descarta.
 */

export const CATALOG_ITEM_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function catalogItemHref(itemId: string, locale: Locale): string {
  return `${localizeHref("/catalogo", locale)}/${itemId.toLowerCase()}`;
}

export function safeAccountReturn(candidate: string | undefined, locale: Locale): string {
  const cuenta = localizeHref("/cuenta", locale);

  if (candidate === undefined || candidate.length === 0) {
    return cuenta;
  }

  if (candidate.includes("://") || candidate.includes("//") || candidate.includes("\\")) {
    return cuenta;
  }

  const catalog = localizeHref("/catalogo", locale);
  const parts = candidate.split("?");
  const path = parts[0] ?? "";
  const query = parts[1];

  if (path.startsWith(`${catalog}/`)) {
    const itemId = path.slice(`${catalog}/`.length);

    if (itemId.includes("/") || !CATALOG_ITEM_ID.test(itemId)) {
      return catalog;
    }

    return catalogItemHref(itemId, locale);
  }

  if (path !== catalog) {
    return cuenta;
  }

  if (query === undefined || query.length === 0) {
    return catalog;
  }

  const params = new URLSearchParams(query);
  const keys = [...params.keys()];

  if (keys.length !== 1 || keys[0] !== "item") {
    return catalog;
  }

  const item = params.get("item");

  if (item === null || !CATALOG_ITEM_ID.test(item)) {
    return catalog;
  }

  return catalogItemHref(item, locale);
}
