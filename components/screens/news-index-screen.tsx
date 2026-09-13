import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { PreviewCard } from "@/components/design-system/card";
import { Container, Section } from "@/components/design-system/layout";
import { Byline } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { listUpdates } from "@/src/application/use-cases/get-updates";
import { excerpt } from "@/src/domain/rich-text";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function newsIndexMetadata(locale: Locale) {
  const { ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: ui.news.title,
    description: ui.news.seoDescription,
    path: "/novedades",
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
          {ui.news.howToHelp}
        </InlineLink>
        .
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
 * un teléfono.
 *
 * El título de cada entrada es el enlace, no un "leer más" al final: el enlace
 * tiene que decir a dónde lleva cuando se lo escucha aislado en un lector de
 * pantalla.
 */
/**
 * Cinco minutos de atraso máximo para las cifras (ADR-017). Las acciones del
 * backoffice invalidan esta ruta al publicar, así que en la práctica el dato aparece
 * al instante; esto es el piso para lo que se cambie fuera del backoffice.
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
            <ul className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {updates.data.map((update) => (
                <li key={update.id} className="flex min-w-0">
                  <PreviewCard
                    as="h2"
                    href={localizedHref(`/novedades/${update.slug}`, locale)}
                    title={update.title}
                    summary={excerpt(update.body, 140)}
                    action={ui.news.readUpdate}
                    media={update.media[0] ?? null}
                    className="w-full"
                    {...(locale === "en" ? { lang: "es-AR" } : {})}
                    eyebrow={
                      update.publishedAt === null ? undefined : (
                        <Byline isoDate={update.publishedAt} locale={locale} />
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </Container>
    </>
  );
}
