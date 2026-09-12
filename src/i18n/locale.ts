/**
 * Idiomas del sitio público (ADR-023).
 *
 * Dos ids, y no más, hasta que un tercero tenga contenido publicado. El
 * castellano no lleva prefijo: las URLs que ya se compartieron (`/norma`,
 * `/ayudar`) son la canónica. El inglés vive bajo `/en`. Los slugs no se
 * traducen: `/en/reconstruccion`, nunca `/en/reconstruction`.
 *
 * Este módulo no carga contenido. Sólo sabe hablar de rutas y de las etiquetas
 * que van en el HTML y en OpenGraph. El cargador vive en `content/index.ts`.
 */

export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

const HTML_LANG: Record<Locale, string> = {
  es: "es-AR",
  en: "en",
};

const OG_LOCALE: Record<Locale, string> = {
  es: "es_AR",
  en: "en_US",
};

/** El locale de `Intl`, que no es el id corto ni el de OpenGraph. */
const INTL_LOCALE: Record<Locale, string> = {
  es: "es-AR",
  en: "en-US",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}

export function ogLocale(locale: Locale): string {
  return OG_LOCALE[locale];
}

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

/**
 * La ruta canónica, sin prefijo de idioma.
 *
 * `/en` y `/en/norma` vuelven a `/` y `/norma`. Una ruta que empieza con las
 * mismas letras que un idioma (`/entrada`) no se toca: el prefijo es un
 * segmento, no un arranque de palabra.
 */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en") {
    return "/";
  }

  if (pathname.startsWith("/en/")) {
    const rest = pathname.slice("/en".length);
    return rest.length === 0 ? "/" : rest;
  }

  return pathname;
}

/**
 * La URL pública de una ruta canónica en un idioma.
 *
 * `href` es siempre la forma castellana (`/norma`). El inglés recibe `/en`.
 */
export function localizeHref(href: string, locale: Locale): string {
  const canonical = href.startsWith("/") ? href : `/${href}`;

  if (locale === DEFAULT_LOCALE) {
    return canonical;
  }

  if (canonical === "/") {
    return `/${locale}`;
  }

  return `/${locale}${canonical}`;
}

/** La misma sección, en el otro idioma. */
export function switchLocaleHref(pathname: string, to: Locale): string {
  return localizeHref(stripLocalePrefix(pathname), to);
}

/** El otro idioma publicado. Con dos, es el que no es `locale`. */
export function otherLocale(locale: Locale): Locale {
  return locale === "es" ? "en" : "es";
}

/**
 * Los `hreflang` de una ruta canónica.
 *
 * `x-default` apunta al castellano: es el idioma de origen y el que debe ver
 * quien no pide uno en concreto (un crawler, un preview, un agente).
 */
export function languageAlternates(canonicalHref: string): Record<string, string> {
  const path = stripLocalePrefix(canonicalHref);

  return {
    "es-AR": localizeHref(path, "es"),
    en: localizeHref(path, "en"),
    "x-default": localizeHref(path, "es"),
  };
}
