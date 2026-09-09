import type { MetadataRoute } from "next";

import { PUBLIC_ROUTES } from "@/components/site/navigation";
import { listUpdates } from "@/src/application/use-cases/get-updates";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { getSiteUrl } from "@/src/infrastructure/site-url";

/**
 * El sitemap sale de la misma lista de rutas que usa la navegación del pie.
 *
 * Es la forma de que no divergan: una página nueva se agrega en un solo lugar y
 * aparece en los dos. Un sitemap escrito a mano se desactualiza en la segunda
 * página que se agrega, y su desactualización es invisible.
 *
 * No hay `changeFrequency` ni `priority`. Google los ignora desde hace años y
 * declararlos sería decorar el archivo con datos que nadie lee.
 *
 * `lastModified` se omite en las páginas editoriales a propósito: la única fecha
 * honesta sería la del último cambio de contenido, y no la tenemos acá. Poner la
 * fecha del build diría que todas las páginas cambiaron en cada despliegue, que es
 * falso y además le enseña al buscador a no confiar en el campo. Las novedades sí
 * la tienen, porque ahí la fecha existe de verdad.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries = PUBLIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route === "/" ? "" : route}`,
  }));

  const updates = await listUpdates({ dataLayer: getPublicDataLayer(), logger });

  // Sin base, el sitemap son sólo las páginas fijas. Es correcto: no hay novedades
  // publicadas que indexar.
  const updateEntries =
    updates.status === "ok"
      ? updates.data.map((update) => ({
          url: `${siteUrl}/novedades/${update.slug}`,
          ...(update.publishedAt === null
            ? {}
            : { lastModified: new Date(update.publishedAt) }),
        }))
      : [];

  return [...staticEntries, ...updateEntries];
}
