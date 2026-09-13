import { Unavailable } from "@/components/campaign/unavailable";
import { ogImageFrom } from "@/components/campaign/preview-photo";
import { CatalogItem } from "@/components/catalog/item";
import { SecondaryAction } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { getCatalog } from "@/src/application/use-cases/get-catalog";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function catalogMetadata(locale: Locale) {
  const { catalog } = getContent(locale);
  const image = ogImageFrom("/catalogo", locale);

  return pageMetadata({
    locale,
    title: catalog.title,
    description: catalog.seoDescription,
    path: "/catalogo",
    ...(image === undefined ? {} : { image }),
  });
}

export async function CatalogScreen({ locale }: { locale: Locale }) {
  const { catalog, ui } = getContent(locale);
  const result = await getCatalog({ dataLayer: getPublicDataLayer(), logger });

  return (
    <>
      <PageHeader title={catalog.title} lead={catalog.lead} />

      <Container>
        <Section tight>
          <Paragraphs items={catalog.paragraphs} />
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule">
          {result.status !== "ok" ? (
            <Unavailable
              reason={result.reason}
              title={catalog.unavailableTitle}
              copy={ui.unavailable}
            />
          ) : result.data.length === 0 ? (
            <EmptyState title={catalog.emptyTitle}>
              <p>{catalog.emptyBody}</p>
            </EmptyState>
          ) : (
            <div>
              {result.data.map((item) => (
                <CatalogItem key={item.id} item={item} copy={catalog} />
              ))}
            </div>
          )}
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <SecondaryAction href={localizedHref("/ayudar", locale)}>
            {catalog.howToHelp}
          </SecondaryAction>
        </Section>
      </Container>
    </>
  );
}
