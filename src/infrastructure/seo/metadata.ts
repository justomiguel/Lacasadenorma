import type { Metadata } from "next";

import { getContent } from "@/content";
import {
  languageAlternates,
  localizeHref,
  ogLocale,
  otherLocale,
  type Locale,
} from "@/src/i18n/locale";
import { getSiteUrl } from "@/src/infrastructure/site-url";

import { SHARE_CARD_SIZE, shareCardUrl } from "./share-copy";

/**
 * Metadata de una página, **en el idioma de la página**.
 *
 * La canónica apunta a *esta* URL (`/norma` o `/en/norma`), no a las dos. Los
 * `hreflang` sí listan las dos, más `x-default` al castellano: es el idioma de
 * origen (ADR-023).
 *
 * La imagen de Open Graph es siempre la tarjeta del símbolo más el copy de
 * **esta** página, no una foto (ADR-036).
 */
export interface PageMetadataInput {
  readonly locale: Locale;
  /** Sin el nombre del sitio: lo agrega la plantilla del layout. */
  readonly title: string;
  readonly description: string;
  /** Ruta canónica en castellano, con barra inicial. */
  readonly path: string;
  readonly publishedTime?: string;
  readonly noIndex?: boolean;
}

function shareImage(locale: Locale, path: string, title: string) {
  return {
    url: shareCardUrl(path, locale),
    width: SHARE_CARD_SIZE.width,
    height: SHARE_CARD_SIZE.height,
    alt: title,
  };
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { site } = getContent(input.locale);
  const url = localizeHref(input.path, input.locale);
  const fullTitle = `${input.title} — ${site.name}`;
  const alternate = ogLocale(otherLocale(input.locale));
  const image = shareImage(input.locale, input.path, fullTitle);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: url,
      languages: languageAlternates(input.path),
    },
    openGraph: {
      type: input.publishedTime === undefined ? "website" : "article",
      locale: ogLocale(input.locale),
      alternateLocale: [alternate],
      siteName: site.name,
      title: fullTitle,
      description: input.description,
      url,
      images: [image],
      ...(input.publishedTime === undefined
        ? {}
        : { publishedTime: input.publishedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: [image.url],
    },
    ...(input.noIndex === true ? { robots: { index: false, follow: false } } : {}),
  };
}

export function rootMetadata(locale: Locale): Metadata {
  const { site } = getContent(locale);
  const url = localizeHref("/", locale);
  const fullTitle = `${site.name} — ${site.tagline}`;
  const image = shareImage(locale, "/", fullTitle);

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: fullTitle,
      template: `%s — ${site.name}`,
    },
    description: site.shortDescription,
    applicationName: site.name,
    alternates: {
      canonical: url,
      languages: languageAlternates("/"),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      alternateLocale: [ogLocale(otherLocale(locale))],
      siteName: site.name,
      title: fullTitle,
      description: site.shortDescription,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: site.shortDescription,
      images: [image.url],
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
  };
}
