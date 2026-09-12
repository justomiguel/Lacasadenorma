import { type ExpenseRecord } from "@/src/domain/entities";
import { formatMoney } from "@/src/domain/money";
import type { UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";

import { cn } from "./cn";
import { formatLongDate } from "./dates";

const DEFAULT_LEDGER: UiContent["ledger"] = {
  date: "Fecha",
  concept: "Concepto",
  category: "Categoría",
  receipt: "Comprobante",
  amount: "Monto",
  yes: "Sí",
  receiptYes: "Tiene {count} comprobante{plural} en el archivo interno",
  receiptMissing: "Sin cargar",
  caption:
    "{count} gastos publicados. La suma de esta tabla es el total gastado de más arriba.",
};

const DEFAULT_CATEGORIES: UiContent["expenseCategories"] = {
  materiales: "Materiales",
  mano_de_obra: "Mano de obra",
  servicios: "Servicios",
  transporte: "Transporte",
  herramientas: "Herramientas",
  otros: "Otros",
};

/**
 * Libro de gastos.
 *
 * Es una `<table>` con `<caption>` y encabezados asociados, porque es
 * literalmente una tabla de datos y cualquier otra cosa sería peor para quien la
 * recorre con un lector de pantalla.
 *
 * En mobile **no** hace scroll horizontal: cada fila se reordena en bloque. Una
 * tabla financiera que se lee de costado no se lee.
 */
export function Ledger({
  expenses,
  caption,
  locale = "es",
  ledger = DEFAULT_LEDGER,
  categories = DEFAULT_CATEGORIES,
  className,
}: {
  expenses: readonly ExpenseRecord[];
  caption: string;
  locale?: Locale;
  ledger?: UiContent["ledger"];
  categories?: UiContent["expenseCategories"];
  className?: string;
}) {
  const intl = intlLocale(locale);

  return (
    <table className={cn("w-full border-collapse text-left", className)}>
      <caption className="mb-md text-left font-ui text-small text-ink-muted">
        {caption}
      </caption>
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-rule">
          <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
            {ledger.date}
          </th>
          <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
            {ledger.concept}
          </th>
          <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
            {ledger.category}
          </th>
          <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
            {ledger.receipt}
          </th>
          <th scope="col" className="py-sm text-right font-ui text-label text-ink-muted">
            {ledger.amount}
          </th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr
            key={expense.id}
            className="block border-b border-rule py-md md:table-row md:py-0"
          >
            <td className="block py-3xs font-ui text-small text-ink-muted md:table-cell md:py-sm md:pr-md">
              <time dateTime={expense.spentAt}>
                {formatLongDate(expense.spentAt, intl)}
              </time>
            </td>
            <th
              scope="row"
              className="block py-3xs text-left text-body font-normal md:table-cell md:py-sm md:pr-md"
            >
              {expense.concept}
              {expense.supplier === null ? null : (
                <span className="block font-ui text-small text-ink-muted md:inline md:pl-xs">
                  {expense.supplier}
                </span>
              )}
            </th>
            <td className="block py-3xs font-ui text-small text-ink-muted md:table-cell md:py-sm md:pr-md">
              {categories[expense.category]}
            </td>
            <td className="block py-3xs font-ui text-small text-ink-muted md:table-cell md:py-sm md:pr-md">
              {expense.receiptCount > 0 ? (
                <>
                  <span aria-hidden="true">{ledger.yes}</span>
                  <span className="sr-only">
                    {fill(ledger.receiptYes, {
                      count: String(expense.receiptCount),
                      plural: expense.receiptCount === 1 ? "" : "s",
                    })}
                  </span>
                </>
              ) : (
                ledger.receiptMissing
              )}
            </td>
            <td
              className="block py-3xs font-ui text-subheading font-medium md:table-cell md:py-sm md:text-right"
              data-figure
            >
              {formatMoney(expense.amount, intl)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
