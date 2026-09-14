import { Unavailable } from "@/components/campaign/unavailable";
import { SecondaryAction } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { formatLongDate } from "@/components/design-system/dates";
import { Container, Section } from "@/components/design-system/layout";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import type { DonationWallEntry } from "@/src/domain/entities";
import { getDonationWall } from "@/src/application/use-cases/get-donation-wall";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import { intlLocale, type Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function wallMetadata(locale: Locale) {
  const { wall } = getContent(locale);

  return pageMetadata({
    locale,
    title: wall.title,
    description: wall.seoDescription,
    path: "/quienes-ayudaron",
  });
}

export async function WallScreen({ locale }: { locale: Locale }) {
  const { wall, catalog, ui } = getContent(locale);
  const result = await getDonationWall({ dataLayer: getPublicDataLayer(), logger });

  return (
    <>
      <PageHeader title={wall.title} lead={wall.lead} />

      <Container>
        <Section>
          {result.status !== "ok" ? (
            <Unavailable
              reason={result.reason}
              title={wall.unavailableTitle}
              copy={ui.unavailable}
            />
          ) : result.data.length === 0 ? (
            <EmptyState title={wall.emptyTitle}>
              <p>{wall.emptyBody}</p>
            </EmptyState>
          ) : (
            <ol className="m-0 list-none p-0">
              {result.data.map((entry) => (
                <WallLine
                  key={entry.id}
                  entry={entry}
                  brought={wall.brought}
                  quantityOnly={wall.quantityOnly}
                  locale={locale}
                />
              ))}
            </ol>
          )}
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <SecondaryAction href={localizedHref("/catalogo", locale)}>
            {catalog.title}
          </SecondaryAction>
        </Section>
      </Container>
    </>
  );
}

function WallLine({
  entry,
  brought,
  quantityOnly,
  locale,
}: {
  entry: DonationWallEntry;
  brought: string;
  quantityOnly: string;
  locale: Locale;
}) {
  const what =
    entry.itemTitle === null
      ? fill(quantityOnly, { count: String(entry.quantity) })
      : `${String(entry.quantity)} · ${entry.itemTitle}`;
  const when = formatLongDate(entry.fulfilledAt.slice(0, 10), intlLocale(locale));

  return (
    <li className="border-t border-rule py-lg first:border-t-0">
      <h2 className="font-display text-section-title">{entry.donorDisplayName}</h2>
      <p className="mt-xs max-w-measure text-body">
        {fill(brought, { name: entry.donorDisplayName, what })}
      </p>
      <p className="mt-2xs font-ui text-caption text-ink-muted">
        <time dateTime={entry.fulfilledAt.slice(0, 10)}>{when}</time>
      </p>
    </li>
  );
}
