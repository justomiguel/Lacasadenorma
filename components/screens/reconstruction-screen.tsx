import { HelpCta } from "@/components/campaign/help-cta";
import { SecondaryAction } from "@/components/design-system/actions";
import { Band, Container, Section } from "@/components/design-system/layout";
import { NewsFeed, NewsFeedItem } from "@/components/design-system/news-feed";
import { PhotoSequence } from "@/components/design-system/photo";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { keepStaleOnError } from "@/src/application/result";
import { listUpdates } from "@/src/application/use-cases/get-updates";
import { coverPhoto } from "@/src/domain/entities";
import { excerpt } from "@/src/domain/rich-text";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function reconstructionMetadata(locale: Locale) {
  const { reconstruction, ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: reconstruction.title,
    description: ui.reconstructionPage.seoDescription,
    path: "/reconstruccion",
  });
}

export async function ReconstructionScreen({ locale }: { locale: Locale }) {
  const { reconstruction, ui } = getContent(locale);
  const latest = keepStaleOnError(
    await listUpdates({
      dataLayer: getPublicDataLayer(),
      logger,
      limit: 1,
    }),
  );
  const update =
    latest.status === "ok" && latest.data[0] !== undefined ? latest.data[0] : null;

  return (
    <>
      <PageHeader title={reconstruction.title} lead={reconstruction.lead} />

      <Container>
        <Section tight>
          <Paragraphs items={reconstruction.paragraphs} />
        </Section>
      </Container>

      {reconstruction.photoEssay.length === 0 ? null : (
        <Band tone="sunk">
          <Container>
            <Section labelledBy="el-trabajo">
              <SectionHeading title={ui.reconstructionPage.workHeading} id="el-trabajo" />
              <PhotoSequence groups={reconstruction.photoEssay} />
            </Section>
          </Container>
        </Band>
      )}

      {update === null ? null : (
        <Container>
          <Section className="border-t border-rule" labelledBy="lo-ultimo">
            <SectionHeading title={ui.reconstructionPage.latestHeading} id="lo-ultimo" />
            <p className="mt-md max-w-measure text-body text-ink-muted">
              {ui.reconstructionPage.photosNote}
            </p>
            <div className="mt-xl">
              <NewsFeed>
                <NewsFeedItem
                  href={localizedHref(`/novedades/${update.slug}`, locale)}
                  title={update.title}
                  date={update.publishedAt}
                  summary={excerpt(update.body, 140)}
                  action={ui.news.readUpdate}
                  photo={coverPhoto(update)}
                  locale={locale}
                  prefetch={false}
                  {...(locale === "en" ? { lang: "es-AR" } : {})}
                />
              </NewsFeed>
            </div>
            <SecondaryAction
              href={localizedHref("/novedades", locale)}
              prefetch={false}
              className="mt-lg"
            >
              {ui.reconstructionPage.seeNews}
            </SecondaryAction>
          </Section>
        </Container>
      )}

      {reconstruction.scope.length === 0 ? null : (
        <Container>
          <Section className="border-t border-rule" labelledBy="alcance">
            <SectionHeading title={ui.reconstructionPage.scopeHeading} id="alcance" />
            <dl className="border-t border-rule">
              {reconstruction.scope.map((item) => (
                <div key={item.title} className="border-b border-rule py-md">
                  <dt className="text-body font-medium">{item.title}</dt>
                  <dd className="mt-3xs max-w-measure text-body text-ink-muted">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </Container>
      )}

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-display text-heading">
            {ui.reconstructionPage.helpHeading}
          </h2>
          <div className="mt-lg">
            <HelpCta
              origen="reconstruccion"
              href={localizedHref("/ayudar", locale)}
              label={`${ui.helpCta} →`}
            />
          </div>
        </Section>
      </Container>
    </>
  );
}
