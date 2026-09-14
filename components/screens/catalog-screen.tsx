import { Unavailable } from "@/components/campaign/unavailable";
import { CatalogFocus } from "@/components/catalog/focus";
import { CatalogItem } from "@/components/catalog/item";
import { ConflictNotice } from "@/components/catalog/conflict-notice";
import { WallPreview } from "@/components/catalog/wall-preview";
import { SecondaryAction } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { getCatalog } from "@/src/application/use-cases/get-catalog";
import { getDonationWall } from "@/src/application/use-cases/get-donation-wall";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function catalogMetadata(locale: Locale) {
  const { catalog } = getContent(locale);

  return pageMetadata({
    locale,
    title: catalog.title,
    description: catalog.seoDescription,
    path: "/catalogo",
  });
}

export async function CatalogScreen({
  locale,
  conflictId,
  focusId,
}: {
  locale: Locale;
  conflictId: string | null;
  focusId: string | null;
}) {
  const { catalog, account, ui } = getContent(locale);
  const dataLayer = getPublicDataLayer();
  const [result, wall] = await Promise.all([
    getCatalog({ dataLayer, logger }),
    getDonationWall({ dataLayer, logger }),
  ]);
  const wallEntries = wall.status === "ok" ? wall.data : [];

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
              {conflictId === null ? null : <ConflictNotice copy={catalog} />}
              <CatalogFocus itemId={focusId} />
              {result.data.map((item) => (
                <CatalogItem
                  key={item.id}
                  item={item}
                  copy={catalog}
                  account={account}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <WallPreview locale={locale} entries={wallEntries} />
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
