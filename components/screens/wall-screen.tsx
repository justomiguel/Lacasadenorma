import { type ReactNode } from "react";

import { Unavailable } from "@/components/campaign/unavailable";
import { SecondaryAction } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { formatLongDate } from "@/components/design-system/dates";
import { Container, Section } from "@/components/design-system/layout";
import { SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { keepStaleOnError } from "@/src/application/result";
import { getContributionWall } from "@/src/application/use-cases/get-contribution-wall";
import { getDonationWall } from "@/src/application/use-cases/get-donation-wall";
import type { ContributionWallEntry, DonationWallEntry } from "@/src/domain/entities";
import { formatPercentage } from "@/src/domain/percentage";
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
  const dataLayer = getPublicDataLayer();
  const [inKindResult, moneyResult] = await Promise.all([
    getDonationWall({ dataLayer, logger }).then(keepStaleOnError),
    getContributionWall({ dataLayer, logger }).then(keepStaleOnError),
  ]);
  const inKindUnavailable = inKindResult.status !== "ok";
  const moneyUnavailable = moneyResult.status !== "ok";
  const inKind = inKindResult.status === "ok" ? inKindResult.data : [];
  const money = moneyResult.status === "ok" ? moneyResult.data : [];
  const inKindReason = inKindResult.status === "ok" ? "error" : inKindResult.reason;
  const moneyReason = moneyResult.status === "ok" ? "error" : moneyResult.reason;
  const empty =
    !inKindUnavailable && !moneyUnavailable && inKind.length === 0 && money.length === 0;
  const bothUnavailable = inKindUnavailable && moneyUnavailable;

  return (
    <>
      <PageHeader title={wall.title} lead={wall.lead} />

      <Container>
        <Section>
          {bothUnavailable ? (
            <Unavailable
              reason={inKindReason}
              title={wall.unavailableTitle}
              copy={ui.unavailable}
            />
          ) : empty ? (
            <EmptyState title={wall.emptyTitle}>
              <p>{wall.emptyBody}</p>
            </EmptyState>
          ) : (
            <>
              {inKindUnavailable ? (
                <Unavailable
                  reason={inKindReason}
                  title={wall.unavailableTitle}
                  copy={ui.unavailable}
                />
              ) : inKind.length === 0 ? null : (
                <WallKindSection title={wall.inKindHeading} id="especie">
                  <ol className="m-0 list-none p-0">
                    {inKind.map((entry) => (
                      <InKindLine
                        key={entry.id}
                        entry={entry}
                        brought={wall.brought}
                        quantityOnly={wall.quantityOnly}
                        locale={locale}
                      />
                    ))}
                  </ol>
                </WallKindSection>
              )}
              {moneyUnavailable ? (
                <Unavailable
                  reason={moneyReason}
                  title={wall.unavailableTitle}
                  copy={ui.unavailable}
                />
              ) : money.length === 0 ? null : (
                <WallKindSection
                  title={wall.moneyHeading}
                  id="plata"
                  {...(inKind.length === 0 ? {} : { className: "mt-3xl" })}
                >
                  <ol className="m-0 list-none p-0">
                    {money.map((entry) => (
                      <MoneyLine
                        key={entry.id}
                        entry={entry}
                        share={wall.moneyShare}
                        locale={locale}
                      />
                    ))}
                  </ol>
                </WallKindSection>
              )}
            </>
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

function WallKindSection({
  title,
  id,
  className,
  children,
}: {
  title: string;
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className} aria-labelledby={id}>
      <SectionHeading title={title} id={id} />
      {children}
    </section>
  );
}

function InKindLine({
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
      <h3 className="font-display text-section-title">{entry.donorDisplayName}</h3>
      <p className="mt-xs max-w-measure text-body">
        {fill(brought, { name: entry.donorDisplayName, what })}
      </p>
      <p className="mt-2xs font-ui text-caption text-ink-muted">
        <time dateTime={entry.fulfilledAt.slice(0, 10)}>{when}</time>
      </p>
    </li>
  );
}

function MoneyLine({
  entry,
  share,
  locale,
}: {
  entry: ContributionWallEntry;
  share: string;
  locale: Locale;
}) {
  const when = formatLongDate(entry.receivedAt.slice(0, 10), intlLocale(locale));
  const percent =
    entry.percentOfReceived === null
      ? null
      : fill(share, { percent: formatPercentage(entry.percentOfReceived) });

  return (
    <li className="border-t border-rule py-lg first:border-t-0">
      <h3 className="font-display text-section-title">{entry.donorDisplayName}</h3>
      {percent === null ? null : (
        <p className="mt-xs max-w-measure text-body">{percent}</p>
      )}
      <p className="mt-2xs font-ui text-caption text-ink-muted">
        <time dateTime={entry.receivedAt.slice(0, 10)}>{when}</time>
      </p>
    </li>
  );
}
