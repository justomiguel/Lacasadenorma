import { formatMoney } from "@/src/domain/money";
import type { FundraisingProgress, MilestoneProgress } from "@/src/domain/progress";
import type { UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";
import { formatLongDate } from "@/components/design-system/dates";

import { Callout } from "@/components/design-system/callout";
import { ProgressBar } from "@/components/design-system/figures";

/**
 * Cómo va la campaña: plata y obra, en ese orden y por separado.
 *
 * Son dos medidas distintas y presentarlas como una sola sería engañoso: un 60%
 * de la plata no es un 60% de la casa. La barra mide dinero; la línea de abajo
 * mide hitos.
 *
 * La fecha de conciliación va siempre pegada a la cifra. Un número sin fecha no
 * es un dato, es una afirmación.
 */
export function CampaignProgress({
  fundraising,
  milestones,
  reconciledAt,
  reconciliationIsStale,
  locale = "es",
  ui,
  className,
}: {
  fundraising: FundraisingProgress;
  milestones: MilestoneProgress;
  reconciledAt: string | null;
  reconciliationIsStale: boolean;
  locale?: Locale;
  ui: UiContent;
  className?: string;
}) {
  const intl = intlLocale(locale);

  return (
    <div className={className}>
      <ProgressBar
        raised={fundraising.raised}
        goal={fundraising.goal}
        percent={fundraising.percent}
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

      {fundraising.otherCurrencies.length === 0 ? null : (
        <p className="mt-xs max-w-measure font-ui text-small text-ink-muted" data-figure>
          {fill(ui.progress.otherCurrencies, {
            amounts: fundraising.otherCurrencies
              .map((amount) => formatMoney(amount, intl))
              .join(locale === "en" ? " and " : " y "),
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
