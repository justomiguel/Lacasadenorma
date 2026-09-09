import { formatMoney } from "@/src/domain/money";
import type { BudgetItem } from "@/src/domain/entities";

import { EmptyState } from "@/components/design-system/callout";

/**
 * Rubros del presupuesto.
 *
 * Un rubro sin cotizar se muestra **sin monto**, no con un cero ni con un "a
 * definir" que parezca una cifra. La lista incompleta es el dato honesto: dice
 * que la obra se está relevando, que es exactamente lo que está pasando.
 *
 * Es una lista de definiciones y no una tabla porque no hay columnas que
 * comparar: cada rubro tiene un nombre, una explicación y a veces un monto.
 */
export function BudgetList({
  items,
  className,
}: {
  items: readonly BudgetItem[];
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="El presupuesto se está armando"
        {...(className === undefined ? {} : { className })}
      >
        <p>
          La familia está relevando la obra con gente del pueblo. Cada rubro aparece acá
          con su monto en cuanto queda cotizado. Preferimos una lista incompleta a un
          número inventado.
        </p>
      </EmptyState>
    );
  }

  const quoted = items.filter((item) => item.estimatedAmount !== null);

  return (
    <div className={className}>
      <dl className="border-t border-rule">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-2xs border-b border-rule py-md sm:grid-cols-[1fr_auto] sm:gap-lg"
          >
            <div>
              <dt className="text-body font-medium">{item.title}</dt>
              {item.description === null ? null : (
                <dd className="mt-3xs max-w-measure text-small text-ink-muted">
                  {item.description}
                </dd>
              )}
            </div>
            <dd className="font-ui text-subheading font-medium sm:text-right" data-figure>
              {item.estimatedAmount === null ? (
                <span className="font-normal text-ink-muted">Sin cotizar</span>
              ) : (
                formatMoney(item.estimatedAmount)
              )}
            </dd>
          </div>
        ))}
      </dl>

      {quoted.length === items.length ? null : (
        <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
          {quoted.length === 0
            ? "Ningún rubro está cotizado todavía."
            : `${String(quoted.length)} de ${String(items.length)} rubros están cotizados. El resto aparece sin monto hasta que lo esté.`}
        </p>
      )}
    </div>
  );
}
