import type { FundraisingProgress, MilestoneProgress } from "@/src/domain/progress";
import type { TransparencySummary } from "@/src/domain/transparency";
import type { UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";
import { formatLongDate } from "@/components/design-system/dates";

import { Callout } from "@/components/design-system/callout";
import { ProgressBar } from "@/components/design-system/figures";

/**
 * Cómo va la campaña: plata como composición de lo ya conocido, y obra aparte.
 *
 * Un 60% de lo que llegó no es un 60% de la casa. El 100% de la obra no está
 * publicado (ADR-040).
 */
export function CampaignProgress({
  fundraising,
  transparency,
  milestones,
  reconciledAt,
  reconciliationIsStale,
  locale = "es",
  ui,
  className,
}: {
  fundraising: FundraisingProgress;
  transparency: TransparencySummary;
  milestones: MilestoneProgress;
  reconciledAt: string | null;
  reconciliationIsStale: boolean;
  locale?: Locale;
  ui: UiContent;
  className?: string;
}) {
  const intl = intlLocale(locale);
  const otherCurrencies = fundraising.otherCurrencies.map((amount) => amount.currency);

  return (
    <div className={className}>
      <ProgressBar
        spentPercent={transparency.primary.executedPercent}
        remainingPercent={transparency.primary.remainingPercent}
        locale={locale}
        figures={ui.figures}
      />

      <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
        {reconciledAt === null
          ? ui.progress.noReconciliation
          : fill(ui.progress.reconciledOn, {
              date: formatLongDate(reconciledAt, intl),
            })}
      </p>

      {otherCurrencies.length === 0 ? null : (
        <p className="mt-xs max-w-measure font-ui text-small text-ink-muted">
          {fill(ui.progress.otherCurrencies, {
            currencies: otherCurrencies.join(locale === "en" ? " and " : " y "),
          })}
        </p>
      )}

      {milestones.totalCount === 0 ? null : (
        <p className="mt-lg max-w-measure text-body" data-figure>
          {fill(ui.progress.milestones, {
            completed: String(milestones.completedCount),
            total: String(milestones.totalCount),
          })}
        </p>
      )}

      {reconciliationIsStale ? (
        <Callout tone="warning" title={ui.progress.staleTitle} className="mt-lg">
          <p>{ui.progress.staleBody}</p>
        </Callout>
      ) : null}
    </div>
  );
}
