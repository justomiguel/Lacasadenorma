import { formatMoney, type CurrencyCode } from "@/src/domain/money";
import type { ChartUnit } from "@/src/domain/metrics";

export function formatChartValue(
  unit: ChartUnit,
  value: number,
  currency: CurrencyCode | null,
): string {
  if (unit === "money" && currency !== null) {
    return formatMoney({ amountMinor: value, currency });
  }

  return new Intl.NumberFormat("es-AR").format(value);
}

export const SERIES_FILL: Record<string, string> = {
  inflow: "var(--color-forest)",
  outflow: "var(--color-olive)",
  raised: "var(--color-forest)",
  visitors: "var(--color-forest)",
  pageviews: "var(--color-olive)",
};

export function seriesFill(id: string): string {
  return SERIES_FILL[id] ?? "var(--color-forest)";
}

export function ChartTable({
  columns,
  rows,
}: {
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <div className="mt-lg overflow-x-auto">
      <table className="w-full border-t border-rule font-ui text-small text-ink">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-b border-rule py-xs text-left font-medium text-ink-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-rule">
              {row.map((cell, index) => (
                <td key={`${row[0] ?? ""}-${String(index)}`} className="py-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
