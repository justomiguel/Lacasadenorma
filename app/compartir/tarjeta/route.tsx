import { findUpdate } from "@/src/application/use-cases/get-updates";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { renderShareCard } from "@/src/infrastructure/seo/share-card";
import {
  parseShareLocale,
  resolveShareCopy,
  type PublishedUpdateCopy,
} from "@/src/infrastructure/seo/share-copy";

/**
 * Imagen de 1200×630 que Facebook, WhatsApp y X piden al compartir.
 *
 * El texto no viaja en la query: sólo la ruta canónica y el idioma. El copy
 * se resuelve acá, contra el paquete verificado (ADR-036).
 */

export const runtime = "nodejs";
export const contentType = "image/png";
export const dynamic = "force-dynamic";

async function publishedUpdate(slug: string): Promise<PublishedUpdateCopy | null> {
  const result = await findUpdate({
    dataLayer: getPublicDataLayer(),
    logger,
    slug,
  });

  if (result.status !== "ok" || result.data === null) {
    return null;
  }

  return { title: result.data.title, body: result.data.body };
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const locale = parseShareLocale(url.searchParams.get("lang"));
  const copy = await resolveShareCopy(
    url.searchParams.get("ruta") ?? "/",
    locale,
    publishedUpdate,
  );

  return renderShareCard(copy);
}
