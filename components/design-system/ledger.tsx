import { EXPENSE_CATEGORY_LABELS, type ExpenseRecord } from "@/src/domain/entities";
import { formatMoney } from "@/src/domain/money";

import { cn } from "./cn";

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

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function Ledger({
  expenses,
  caption,
  className,
}: {
  expenses: readonly ExpenseRecord[];
  caption: string;
  className?: string;
}) {
  return (
    <table className={cn("w-full border-collapse text-left", className)}>
      <caption className="mb-md text-left font-ui text-small text-ink-muted">
        {caption}
      </caption>
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-rule">
          <th scope="col" className="py-sm pr-md font-ui text-label uppercase text-ink-muted">
            Fecha
          </th>
          <th scope="col" className="py-sm pr-md font-ui text-label uppercase text-ink-muted">
            Concepto
          </th>
          <th scope="col" className="py-sm pr-md font-ui text-label uppercase text-ink-muted">
            Categoría
          </th>
          <th scope="col" className="py-sm pr-md font-ui text-label uppercase text-ink-muted">
            Comprobante
          </th>
          <th
            scope="col"
            className="py-sm text-right font-ui text-label uppercase text-ink-muted"
          >
            Monto
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
              <time dateTime={expense.spentAt}>{formatDate(expense.spentAt)}</time>
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
              {EXPENSE_CATEGORY_LABELS[expense.category]}
            </td>
            <td className="block py-3xs font-ui text-small text-ink-muted md:table-cell md:py-sm md:pr-md">
              {expense.receiptCount > 0 ? (
                <>
                  <span aria-hidden="true">Sí</span>
                  <span className="sr-only">
                    Tiene {String(expense.receiptCount)} comprobante
                    {expense.receiptCount === 1 ? "" : "s"} en el archivo interno
                  </span>
                </>
              ) : (
                "Sin cargar"
              )}
            </td>
            <td
              className="block py-3xs font-ui text-subheading font-medium md:table-cell md:py-sm md:text-right"
              data-figure
            >
              {formatMoney(expense.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
