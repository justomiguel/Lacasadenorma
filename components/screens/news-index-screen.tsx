import { ogImageFrom, previewPhotoFor } from "@/components/campaign/preview-photo";
import { Unavailable } from "@/components/campaign/unavailable";
import { EmptyState } from "@/components/design-system/callout";
import { PreviewCard } from "@/components/design-system/card";
import { Container, Section } from "@/components/design-system/layout";
import { NewsFeed, NewsFeedItem } from "@/components/design-system/news-feed";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { listUpdates } from "@/src/application/use-cases/get-updates";
import { excerpt } from "@/src/domain/rich-text";
import { isPhoto } from "@/src/domain/entities";
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
 * datos quedaría un título y un cartel: una pared. Esto no es relleno para llenar
 * la pantalla —dice qué va a haber acá y hacia dónde seguir mientras tanto—, y por
 * eso vale también cuando la campaña está conectada y todavía no publicó nada.
 */
function QueEsElDiario({ locale }: { locale: Locale }) {
  const { help, norma, reconstruction, ui } = getContent(locale);

  return (
    <div className="space-y-xl">
      <div className="max-w-measure space-y-md text-body">
        <p>{ui.news.intro}</p>
        <p className="text-ink-muted">{ui.news.introLinks}</p>
      </div>
      <ul className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
        <li className="flex min-w-0">
          <PreviewCard
            as="h2"
            className="w-full"
            href={localizedHref("/norma", locale)}
            title={norma.knownAs ?? norma.fullName}
            action={ui.home.seeNorma}
            media={previewPhotoFor("/norma", locale)}
          />
        </li>
        <li className="flex min-w-0">
          <PreviewCard
            as="h2"
            className="w-full"
            href={localizedHref("/reconstruccion", locale)}
            title={reconstruction.title}
            action={ui.home.seeWork}
            media={previewPhotoFor("/reconstruccion", locale)}
          />
        </li>
        <li className="flex min-w-0">
          <PreviewCard
            as="h2"
            className="w-full"
            href={localizedHref("/ayudar", locale)}
            title={help.title}
            action={ui.helpCta}
            media={previewPhotoFor("/ayudar", locale)}
          />
        </li>
      </ul>
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
