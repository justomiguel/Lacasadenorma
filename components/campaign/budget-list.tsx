import { formatMoney } from "@/src/domain/money";
import type { BudgetItem } from "@/src/domain/entities";
import type { UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";

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

  const quoted = items.filter((item) => item.estimatedAmount !== null);

  return (
    <div className={className}>
      <dl className="border-t border-rule">
        {/* El `<div>` envuelve cada grupo, que es lo único que un `<dl>` admite entre
            medio, y el `<dt>` y los `<dd>` son hijos directos de ese div. Un envoltorio
            más adentro —el que había acá para agrupar el título con la descripción—
            rompe la asociación etiqueta-valor, y con ella la única cosa que hace que
            esta lista sea una lista de definiciones y no tres textos sueltos.

            La colocación en dos columnas la resuelve la grilla por orden: el título
            cae en la primera celda, el monto a su derecha y la descripción abajo. */}
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-2xs border-b border-rule py-md sm:grid-cols-[1fr_auto] sm:gap-lg"
          >
            {/* `font-ui` y no la serif del cuerpo: el nombre del rubro es un dato de
                la campaña, no prosa, y comparte fila con un monto que ya está en la
                voz de interfaz. Con las dos familias en la misma línea la mezcla se
                lee como un descuido y no como una jerarquía (ADR-024). */}
            <dt className="font-ui text-body font-medium">{item.title}</dt>
            <dd className="font-ui text-subheading font-medium sm:text-right" data-figure>
              {item.estimatedAmount === null ? (
                <span className="font-normal text-ink-muted">{ui.figures.unquoted}</span>
              ) : (
                formatMoney(item.estimatedAmount, intl)
              )}
            </dd>
            {item.description === null ? null : (
              <dd className="max-w-measure text-small text-ink-muted sm:col-start-1">
                {item.description}
              </dd>
            )}
          </div>
        ))}
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
