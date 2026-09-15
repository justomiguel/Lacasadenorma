import { BudgetList } from "@/components/campaign/budget-list";
import { Callout, EmptyState } from "@/components/design-system/callout";
import { ProgressBar, Stat, StatGroup } from "@/components/design-system/figures";
import { Ledger } from "@/components/design-system/ledger";
import { SectionHeading } from "@/components/design-system/typography";
import { formatPercentage } from "@/src/domain/percentage";
import type { BudgetItem } from "@/src/domain/entities";
import type { TransparencySummary } from "@/src/domain/transparency";
import type { UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";
import { formatLongDate } from "@/components/design-system/dates";

/**
 * La rendición pública: porcentajes sobre lo ya conocido, nunca montos (ADR-040).
 */
export function TransparencyReport({
  summary,
  budgetItems,
  locale,
  ui,
}: {
  summary: TransparencySummary;
  budgetItems: readonly BudgetItem[];
  locale: Locale;
  ui: UiContent;
}) {
  const intl = intlLocale(locale);
  const page = ui.transparencyPage;
  const spent =
    summary.primary.executedPercent === null
      ? null
      : formatPercentage(summary.primary.executedPercent, { locale: intl });
  const remaining =
    summary.primary.remainingPercent === null
      ? null
      : formatPercentage(summary.primary.remainingPercent, { locale: intl });
  const otherCurrencies = summary.others.map((item) => item.currency);

  return (
    <>
      <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
        {page.unknownTotal}
      </p>

      <ProgressBar
        spentPercent={summary.primary.executedPercent}
        remainingPercent={summary.primary.remainingPercent}
        locale={locale}
        figures={ui.figures}
        className="mt-xl"
      />

      {spent === null || remaining === null ? null : (
        <StatGroup className="mt-xl">
          <Stat label={ui.figures.spent} amount={spent} />
          <Stat label={ui.figures.balance} amount={remaining} />
        </StatGroup>
      )}

      <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
        {summary.reconciledAt === null
          ? page.noReconciliation
          : fill(page.reconciledOn, {
              date: formatLongDate(summary.reconciledAt, intl),
            })}
        {otherCurrencies.length === 0
          ? null
          : fill(ui.progress.otherCurrencies, {
              currencies: otherCurrencies.join(locale === "en" ? " and " : " y "),
            })}
      </p>

      {summary.reconciliationIsStale ? (
        <Callout tone="warning" title={page.staleTitle} className="mt-lg">
          <p>{page.staleBody}</p>
        </Callout>
      ) : null}

      {summary.byCategory.length === 0 ? null : (
        <div className="mt-3xl">
          <SectionHeading title={page.byCategoryHeading} />
          <dl className="mt-lg border-t border-rule">
            {summary.byCategory.map((entry) => (
              <div
                key={entry.category}
                className="grid gap-2xs border-b border-rule py-md sm:grid-cols-[1fr_auto]"
              >
                <dt className="font-ui text-body">
                  {ui.expenseCategories[entry.category]}
                </dt>
                <dd
                  className="font-ui text-subheading font-medium sm:text-right"
                  data-figure
                >
                  {entry.percentOfSpent === null
                    ? "—"
                    : formatPercentage(entry.percentOfSpent, { locale: intl })}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-3xl">
        <SectionHeading title={page.ledgerHeading} />
        {summary.expenses.length === 0 ? (
          <EmptyState title={page.noExpensesTitle} className="mt-lg">
            <p>{page.noExpensesBody}</p>
          </EmptyState>
        ) : (
          <div className="mt-lg">
            <Ledger
              expenses={summary.expenses}
              caption={fill(ui.ledger.caption, {
                count: String(summary.expenseCount),
              })}
              locale={locale}
              ledger={ui.ledger}
              categories={ui.expenseCategories}
            />
            <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
              {summary.receiptCount === 0
                ? page.noReceipts
                : fill(page.receiptsNote, { count: String(summary.receiptCount) })}
            </p>
          </div>
        )}
      </div>

      {budgetItems.length === 0 ? null : (
        <div className="mt-3xl">
          <SectionHeading title={page.budgetHeading} />
          <BudgetList items={budgetItems} locale={locale} ui={ui} className="mt-lg" />
        </div>
      )}
    </>
  );
}
