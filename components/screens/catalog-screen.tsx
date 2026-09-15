import { Unavailable } from "@/components/campaign/unavailable";
import { CatalogTable } from "@/components/catalog/table";
import { ConflictNotice } from "@/components/catalog/conflict-notice";
import { WallPreview } from "@/components/catalog/wall-preview";
import { SecondaryAction } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { keepStaleOnError } from "@/src/application/result";
import { getCatalog } from "@/src/application/use-cases/get-catalog";
import { getCatalogClaims } from "@/src/application/use-cases/get-catalog-claims";
import { getDonationWall } from "@/src/application/use-cases/get-donation-wall";
import { groupCatalogByCategory } from "@/src/domain/catalog";
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
}: {
  locale: Locale;
  conflictId: string | null;
}) {
  const { catalog, ui } = getContent(locale);
  const dataLayer = getPublicDataLayer();
  const [result, claimsResult, wall] = await Promise.all([
    getCatalog({ dataLayer, logger }).then(keepStaleOnError),
    getCatalogClaims({ dataLayer, logger }).then(keepStaleOnError),
    getDonationWall({ dataLayer, logger }).then(keepStaleOnError),
  ]);
  const wallEntries = wall.status === "ok" ? wall.data : [];
  const claims = claimsResult.status === "ok" ? claimsResult.data : [];

  return (
    <>
      <PageHeader title={catalog.title} lead={catalog.lead} />

      <Container>
        <Section>
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
              {groupCatalogByCategory(result.data).map((group, groupIndex) => (
                <section
                  key={group.category}
                  className={groupIndex === 0 ? undefined : "mt-3xl"}
                >
                  <SectionHeading
                    title={catalog.categories[group.category]}
                    id={group.category}
                  />
                  <CatalogTable
                    items={group.items}
                    claims={claims}
                    copy={catalog}
                    locale={locale}
                  />
                </section>
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
