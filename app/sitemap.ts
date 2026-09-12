import type { MetadataRoute } from "next";

import { PUBLIC_ROUTES } from "@/components/site/navigation";
import { listUpdates } from "@/src/application/use-cases/get-updates";
import { languageAlternates, localizeHref } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { getSiteUrl } from "@/src/infrastructure/site-url";

/**
 * El sitemap sale de la misma lista de rutas que usa la navegación del pie.
 *
 * Lista las dos versiones de cada página y las novedades. Los `hreflang` van
 * en `alternates.languages`: castellano, inglés y `x-default` al origen
 * (ADR-023).
 */
export const revalidate = 300;

function absolute(siteUrl: string, path: string): string {
  return `${siteUrl}${path === "/" ? "" : path}`;
}

function languages(siteUrl: string, canonicalPath: string): Record<string, string> {
  const rel = languageAlternates(canonicalPath);
  return {
    "es-AR": absolute(siteUrl, rel["es-AR"] ?? "/"),
    en: absolute(siteUrl, rel.en ?? "/en"),
    "x-default": absolute(siteUrl, rel["x-default"] ?? "/"),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries = PUBLIC_ROUTES.flatMap((route) => {
    const alternates = { languages: languages(siteUrl, route) };

    return (["es", "en"] as const).map((locale) => ({
      url: absolute(siteUrl, localizeHref(route, locale)),
      alternates,
    }));
  });

  const updates = await listUpdates({ dataLayer: getPublicDataLayer(), logger });

  const updateEntries =
    updates.status === "ok"
      ? updates.data.flatMap((update) => {
          const path = `/novedades/${update.slug}`;
          const alternates = { languages: languages(siteUrl, path) };
          const extra =
            update.publishedAt === null
              ? {}
              : { lastModified: new Date(update.publishedAt) };

          return (["es", "en"] as const).map((locale) => ({
            url: absolute(siteUrl, localizeHref(path, locale)),
            alternates,
            ...extra,
          }));
        })
      : [];

  return [...staticEntries, ...updateEntries];
}
