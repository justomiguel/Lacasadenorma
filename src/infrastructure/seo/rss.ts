import { excerpt } from "@/src/domain/rich-text";

/**
 * RSS 2.0 del diario. Se arma en el servidor a partir de las novedades
 * publicadas: el puerto público no entrega borradores, así que el feed no
 * tiene un camino para incluirlos (I7).
 *
 * El cuerpo del ítem es el excerpt, no HTML. Un `<` en el título se escapa;
 * no hay un paso de sanitización que se pueda configurar mal (T4).
 */

export interface NewsRssItem {
  readonly title: string;
  readonly slug: string;
  readonly publishedAt: string | null;
  readonly body: string;
}

export interface NewsRssInput {
  readonly siteName: string;
  readonly siteUrl: string;
  readonly channelTitle: string;
  readonly channelDescription: string;
  readonly items: readonly NewsRssItem[];
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function rfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

function itemXml(siteUrl: string, item: NewsRssItem): string {
  const url = `${siteUrl}/novedades/${item.slug}`;
  const summary = excerpt(item.body);
  const date =
    item.publishedAt === null
      ? ""
      : `\n      <pubDate>${rfc822(item.publishedAt)}</pubDate>`;

  return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <description>${escapeXml(summary)}</description>${date}
    </item>`;
}

export function renderNewsRss(input: NewsRssInput): string {
  const channelUrl = `${input.siteUrl}/novedades`;
  const items = input.items.map((item) => itemXml(input.siteUrl, item)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${input.channelTitle} — ${input.siteName}`)}</title>
    <link>${escapeXml(channelUrl)}</link>
    <description>${escapeXml(input.channelDescription)}</description>
    <language>es-AR</language>
${items}
  </channel>
</rss>
`;
}
