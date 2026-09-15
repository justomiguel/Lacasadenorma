import { formatPercentage } from "@/src/domain/percentage";
import { quotedBudgetShares } from "@/src/domain/shares";
import type { BudgetItem } from "@/src/domain/entities";
import type { UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";

import { EmptyState } from "@/components/design-system/callout";

/**
 * Rubros del presupuesto, como parte de lo ya cotizado.
 *
 * Un rubro sin cotizar se muestra **sin porcentaje**, no con un cero. La suma de
 * lo cotizado no es el 100% de la obra (ADR-040).
 */
export function BudgetList({
  items,
  locale = "es",
  ui,
  className,
}: {
  items: readonly BudgetItem[];
  locale?: Locale;
  ui: UiContent;
  className?: string;
}) {
  const intl = intlLocale(locale);

  if (items.length === 0) {
    return (
      <EmptyState
        title={ui.budget.emptyTitle}
        {...(className === undefined ? {} : { className })}
      >
        <p>{ui.budget.emptyBody}</p>
      </EmptyState>
    );
  }

  const shares = quotedBudgetShares(items);
  const percentById = new Map(shares.map((share) => [share.id, share.percentOfQuoted]));
  const quoted = items.filter((item) => item.estimatedAmount !== null);

  return (
    <div className={className}>
      <dl className="border-t border-rule">
        {items.map((item) => {
          const percent = percentById.get(item.id) ?? null;

          return (
            <div
              key={item.id}
              className="grid gap-2xs border-b border-rule py-md sm:grid-cols-[1fr_auto] sm:gap-lg"
            >
              <dt className="font-ui text-body font-medium">{item.title}</dt>
              <dd
                className="font-ui text-subheading font-medium sm:text-right"
                data-figure
              >
                {percent === null ? (
                  <span className="font-normal text-ink-muted">
                    {ui.figures.unquoted}
                  </span>
                ) : (
                  formatPercentage(percent, { locale: intl })
                )}
              </dd>
              {item.description === null ? null : (
                <dd className="max-w-measure text-small text-ink-muted sm:col-start-1">
                  {item.description}
                </dd>
              )}
            </div>
          );
        })}
      </dl>

      {quoted.length === items.length ? null : (
        <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
          {quoted.length === 0
            ? ui.budget.noneQuoted
            : fill(ui.budget.someQuoted, {
                quoted: String(quoted.length),
                total: String(items.length),
              })}
        </p>
      )}
    </div>
  );
}
