import { getContent } from "@/content";
import { listUpdates } from "@/src/application/use-cases/get-updates";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { renderNewsRss } from "@/src/infrastructure/seo/rss";
import { getSiteUrl } from "@/src/infrastructure/site-url";

export const revalidate = 300;

/**
 * El diario como canal. Un agregador no corre JavaScript: el XML se arma acá,
 * de las mismas novedades publicadas que `/novedades` (FR-406).
 */
export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl();
  const { site, ui } = getContent("es");
  const updates = await listUpdates({ dataLayer: getPublicDataLayer(), logger });
  const items = updates.status === "ok" ? updates.data : [];

  const xml = renderNewsRss({
    siteName: site.name,
    siteUrl,
    channelTitle: ui.news.title,
    channelDescription: ui.news.seoDescription,
    items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
