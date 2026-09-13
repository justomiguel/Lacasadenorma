import { getContent } from "@/content";
import type { Locale } from "@/src/i18n/locale";
import {
  languageAlternates,
  localizeHref,
  ogLocale,
  otherLocale,
} from "@/src/i18n/locale";
import { getSiteUrl } from "@/src/infrastructure/site-url";

import type { Metadata } from "next";

/**
 * Metadata de una página, **en el idioma de la página**.
 *
 * La canónica apunta a *esta* URL (`/norma` o `/en/norma`), no a las dos. Los
 * `hreflang` sí listan las dos, más `x-default` al castellano: es el idioma de
 * origen (ADR-023).
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
  /** Foto real para Open Graph. Si falta, el buscador no inventa una. */
  readonly image?: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly alt: string;
  };
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { site } = getContent(input.locale);
  const url = localizeHref(input.path, input.locale);
  const fullTitle = `${input.title} — ${site.name}`;
  const alternate = ogLocale(otherLocale(input.locale));

  const ogImage =
    input.image === undefined
      ? undefined
      : {
          url: input.image.url,
          width: input.image.width,
          height: input.image.height,
          alt: input.image.alt,
        };

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
      ...(ogImage === undefined ? {} : { images: [ogImage] }),
      ...(input.publishedTime === undefined
        ? {}
        : { publishedTime: input.publishedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      ...(ogImage === undefined ? {} : { images: [ogImage.url] }),
    },
    ...(input.noIndex === true ? { robots: { index: false, follow: false } } : {}),
  };
}

export function rootMetadata(locale: Locale): Metadata {
  const { site } = getContent(locale);
  const url = localizeHref("/", locale);

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: `${site.name} — ${site.tagline}`,
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
      title: `${site.name} — ${site.tagline}`,
      description: site.shortDescription,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — ${site.tagline}`,
      description: site.shortDescription,
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
  };
}
