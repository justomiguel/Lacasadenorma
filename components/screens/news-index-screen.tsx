import { ogImageFrom } from "@/components/campaign/preview-photo";
import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { NewsFeed, NewsFeedItem } from "@/components/design-system/news-feed";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { listUpdates } from "@/src/application/use-cases/get-updates";
import { isPhoto } from "@/src/domain/entities";
import { excerpt } from "@/src/domain/rich-text";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function newsIndexMetadata(locale: Locale) {
  const { ui } = getContent(locale);
  const image = ogImageFrom("/novedades", locale);

  return pageMetadata({
    locale,
    title: ui.news.title,
    description: ui.news.seoDescription,
    path: "/novedades",
    ...(image === undefined ? {} : { image }),
  });
}

/**
 * Lo que el índice explica de sí mismo cuando no tiene entradas para mostrar.
 *
 * Es el único lugar del sitio donde toda la página depende de la base, así que sin
 * datos quedaría un título y un cartel: una pared. La historia se apunta con
 * enlaces en el texto —para eso están `whoWas`, `whatToRebuild`, `howToHelp` e
 * `introAnd`—, no con una grilla de previas. Tres fotos de otras páginas
 * competían por el LCP y dejaban `/novedades` en 3 000 ms contra el presupuesto
 * de 2 500 (ADR-022, SC-304).
 */
function QueEsElDiario({ locale }: { locale: Locale }) {
  const { ui } = getContent(locale);

  return (
    <div className="max-w-measure space-y-md text-body">
      <p>{ui.news.intro}</p>
      <p className="text-ink-muted">
        {ui.news.introLinks}{" "}
        <InlineLink href={localizedHref("/norma", locale)}>{ui.news.whoWas}</InlineLink>
        {", "}
        <InlineLink href={localizedHref("/reconstruccion", locale)}>
          {ui.news.whatToRebuild}
        </InlineLink>{" "}
        {ui.news.introAnd}{" "}
        <InlineLink href={localizedHref("/ayudar", locale)}>
          {ui.news.howToHelp}.
        </InlineLink>
      </p>
    </div>
  );
}

/**
 * Las novedades, de la más reciente a la más antigua.
 *
 * Es un índice, no un muro de tarjetas: cada entrada es una fecha, un título y
 * dos líneas, separadas por una regla. Una foto por entrada, cuando existe, en la
 * columna angosta. Es la forma que tiene un sumario de revista y funciona igual en
 * un teléfono (ADR-034).
 *
 * El título de cada entrada es el enlace, no un "leer más" al final: el enlace
 * tiene que decir a dónde lleva cuando se lo escucha aislado en un lector de
 * pantalla.
 */
export async function NewsIndexScreen({ locale }: { locale: Locale }) {
  const { ui } = getContent(locale);
  const updates = await listUpdates({ dataLayer: getPublicDataLayer(), logger });

  return (
    <>
      <PageHeader title={ui.news.title} lead={ui.news.lead} />

      <Container>
        <Section>
          {updates.status !== "ok" || updates.data.length === 0 ? (
            <div className="space-y-xl">
              <QueEsElDiario locale={locale} />

              {updates.status !== "ok" ? (
                <Unavailable
                  reason={updates.reason}
                  title={ui.news.unavailableTitle}
                  copy={ui.unavailable}
                />
              ) : (
                <EmptyState title={ui.news.emptyTitle}>
                  <p>{ui.news.emptyBody}</p>
                </EmptyState>
              )}
            </div>
          ) : (
            <NewsFeed>
              {updates.data.map((update) => {
                const cover = update.media.find(isPhoto) ?? null;

                return (
                  <NewsFeedItem
                    key={update.id}
                    href={localizedHref(`/novedades/${update.slug}`, locale)}
                    title={update.title}
                    date={update.publishedAt}
                    summary={excerpt(update.body, 140)}
                    action={ui.news.readUpdate}
                    photo={cover}
                    locale={locale}
                    {...(locale === "en" ? { lang: "es-AR" } : {})}
                  />
                );
              })}
            </NewsFeed>
          )}
        </Section>
      </Container>
    </>
  );
}
