import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShareBlock } from "@/components/campaign/share-block";
import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { PhotoEssay } from "@/components/design-system/photo";
import { RichText } from "@/components/design-system/rich-text";
import { Byline } from "@/components/design-system/typography";
import { StructuredData } from "@/components/site/structured-data";
import { getContent } from "@/content";
import { findUpdate } from "@/src/application/use-cases/get-updates";
import { excerpt } from "@/src/domain/rich-text";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";
import {
  articleSchema,
  breadcrumbSchema,
  graph,
} from "@/src/infrastructure/seo/structured-data";
import { getSiteUrl } from "@/src/infrastructure/site-url";

export const revalidate = 300;

type NewsArticleProps = {
  params: Promise<{ slug: string }>;
};

async function readUpdate(slug: string) {
  return findUpdate({ dataLayer: getPublicDataLayer(), logger, slug });
}

/**
 * Una novedad. Es la unidad que se comparte.
 *
 * La página se lee dos veces —una para la metadata y otra para el cuerpo— y eso
 * no es una lectura de más: Next deduplica las dos llamadas dentro de la misma
 * petición, y separar `generateMetadata` del componente es lo que permite que la
 * vista previa de WhatsApp tenga el título y el resumen reales de la nota y no los
 * genéricos del sitio.
 *
 * Un slug que no existe devuelve 404, no una página vacía. Un slug que existe pero
 * está en borrador **también** devuelve 404: el caso de uso sólo consulta
 * publicadas, así que no hay camino de lectura hacia un borrador (amenaza I7).
 */
export async function generateNewsMetadata(
  locale: Locale,
  props: NewsArticleProps,
): Promise<Metadata> {
  const { slug } = await props.params;
  const result = await readUpdate(slug);
  const { site, ui } = getContent(locale);

  if (result.status !== "ok" || result.data === null) {
    // Sin datos no hay descripción honesta que poner, y una inventada sería peor
    // que ninguna. La página va a devolver 404 de todos modos.
    return pageMetadata({
      locale,
      title: ui.news.fallbackTitle,
      description: site.shortDescription,
      path: `/novedades/${slug}`,
      noIndex: true,
    });
  }

  const update = result.data;

  return pageMetadata({
    locale,
    title: update.title,
    description: excerpt(update.body),
    path: `/novedades/${update.slug}`,
    ...(update.publishedAt === null ? {} : { publishedTime: update.publishedAt }),
  });
}

export async function NewsArticleScreen({
  locale,
  params,
}: {
  locale: Locale;
} & NewsArticleProps) {
  const { slug } = await params;
  const result = await readUpdate(slug);
  const { site, ui } = getContent(locale);

  if (result.status === "unavailable") {
    return (
      <Container>
        <Section>
          <Unavailable reason={result.reason} copy={ui.unavailable} />
        </Section>
      </Container>
    );
  }

  if (result.data === null) {
    notFound();
  }

  const update = result.data;
  const siteUrl = getSiteUrl();
  const summary = excerpt(update.body);
  const path = `/novedades/${update.slug}`;
  const href = localizedHref(path, locale);

  const cmsBody = (
    <>
      <h1 className="mt-md max-w-measure font-prose text-title">{update.title}</h1>

      {update.publishedAt === null ? null : (
        <Byline
          isoDate={update.publishedAt}
          label={ui.publishedOn}
          locale={locale}
          className="mt-lg"
        />
      )}

      <RichText body={update.body} className="mt-2xl" />

      <PhotoEssay media={update.media} className="mt-3xl" />
    </>
  );

  return (
    <Container as="article">
      <Section tight>
        <StructuredData
          json={graph([
            articleSchema({
              siteUrl,
              slug: update.slug,
              title: update.title,
              description: summary,
              publishedAt: update.publishedAt,
              locale,
            }),
            breadcrumbSchema(
              siteUrl,
              [
                { name: ui.homeLabel, path: "/" },
                { name: ui.news.title, path: "/novedades" },
                { name: update.title, path: path },
              ],
              locale,
            ),
          ])}
        />

        <p className="font-ui text-label text-ink-muted">
          <InlineLink
            href={localizedHref("/novedades", locale)}
            className="text-ink-muted"
          >
            {ui.news.title}
          </InlineLink>
        </p>

        {locale === "en" ? (
          <p className="mt-lg max-w-measure font-ui text-small text-ink-muted">
            {ui.news.originalLanguage}
          </p>
        ) : null}

        {locale === "en" ? <div lang="es-AR">{cmsBody}</div> : cmsBody}

        <div className="mt-3xl border-t border-rule pt-xl">
          <h2 className="font-prose text-heading">{ui.news.shareHeading}</h2>
          <ShareBlock
            className="mt-lg"
            url={`${siteUrl}${href}`}
            route={href}
            title={`${update.title} — ${site.name}`}
            text={summary}
          />
        </div>

        <p className="mt-2xl font-ui text-small text-ink-muted">
          <InlineLink href={localizedHref("/novedades", locale)}>
            {ui.news.seeAll}
          </InlineLink>
        </p>
        <p className="mt-sm font-ui text-small text-ink-muted">
          <InlineLink href={localizedHref("/transparencia", locale)}>
            {ui.news.seeTransparency}
          </InlineLink>
        </p>
      </Section>
    </Container>
  );
}
