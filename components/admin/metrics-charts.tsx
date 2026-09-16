import { formatMoney, type CurrencyCode } from "@/src/domain/money";
import type { BarChart, ChartUnit, SeriesChart } from "@/src/domain/metrics";

function formatValue(
  unit: ChartUnit,
  value: number,
  currency: CurrencyCode | null,
): string {
  if (unit === "money" && currency !== null) {
    return formatMoney({ amountMinor: value, currency });
  }

  return new Intl.NumberFormat("es-AR").format(value);
}

const SERIES_FILL: Record<string, string> = {
  inflow: "var(--color-forest)",
  outflow: "var(--color-olive)",
  raised: "var(--color-forest)",
};

/**
 * Un gráfico de barras horizontales más la tabla de las mismas cifras.
 * El color no es el único indicador: cada barra tiene su cifra (FR-605).
 */
export function MetricsBarChart({ chart }: { chart: BarChart }) {
  const max = Math.max(
    ...chart.bars.map((bar) => bar.value),
    ...chart.signals.map((s) => s.value),
    1,
  );

  return (
    <figure>
      <figcaption className="font-ui text-subheading font-medium text-ink">
        {chart.title}
      </figcaption>
      <svg
        role="img"
        aria-labelledby={`${chart.id}-title`}
        viewBox={`0 0 640 ${String(chart.bars.length * 36 + 8)}`}
        className="mt-md h-auto w-full"
      >
        <title id={`${chart.id}-title`}>{chart.title}</title>
        {chart.bars.map((bar, index) => {
          const y = index * 36 + 4;
          const width = Math.max(4, (bar.value / max) * 420);

          return (
            <g key={bar.id}>
              <text x="0" y={y + 16} className="fill-ink font-ui text-caption">
                {bar.label}
              </text>
              <rect
                x="200"
                y={y + 4}
                width={width}
                height="20"
                fill="var(--color-forest)"
              />
              <text x={208 + width} y={y + 18} className="fill-ink font-ui text-caption">
                {formatValue(chart.unit, bar.value, chart.currency)}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTable
        columns={["Categoría", chart.unit === "money" ? "Monto" : "Cantidad"]}
        rows={chart.bars.map((bar) => [
          bar.label,
          formatValue(chart.unit, bar.value, chart.currency),
        ])}
      />
    </figure>
  );
}

/**
 * Flujo o acumulado: barras agrupadas y una línea de señal cuando hay umbral.
 */
export function MetricsSeriesChart({ chart }: { chart: SeriesChart }) {
  const height = 220;
  const width = 640;
  const left = 16;
  const bottom = 36;
  const top = 12;
  const innerWidth = width - left - 16;
  const innerHeight = height - bottom - top;
  const slot = innerWidth / chart.points.length;
  const maxima = chart.points.flatMap((point) => Object.values(point.values));
  const max = Math.max(...maxima, ...chart.signals.map((signal) => signal.value), 1);

  return (
    <figure>
      <figcaption className="font-ui text-subheading font-medium text-ink">
        {chart.title}
      </figcaption>
      <ul className="mt-xs flex flex-wrap gap-md font-ui text-caption text-ink-muted">
        {chart.series.map((series) => (
          <li key={series.id} className="inline-flex items-center gap-xs">
            <span
              className="inline-block size-sm"
              style={{ background: SERIES_FILL[series.id] ?? "var(--color-forest)" }}
              aria-hidden="true"
            />
            {series.label}
          </li>
        ))}
        {chart.signals.map((signal) => (
          <li key={signal.id}>Señal · {signal.label}</li>
        ))}
      </ul>
      <svg
        role="img"
        aria-labelledby={`${chart.id}-title`}
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        className="mt-md w-full"
      >
        <title id={`${chart.id}-title`}>{chart.title}</title>
        {chart.signals.map((signal) => {
          const y = top + innerHeight - (signal.value / max) * innerHeight;

          return (
            <g key={signal.id}>
              <line
                x1={left}
                x2={width - 16}
                y1={y}
                y2={y}
                stroke="var(--color-warning)"
                strokeDasharray="6 4"
                strokeWidth="2"
              />
            </g>
          );
        })}
        {chart.points.map((point, index) => {
          const x = left + index * slot;
          const barWidth = Math.max(4, (slot - 8) / chart.series.length);

          return (
            <g key={point.key}>
              {chart.series.map((series, seriesIndex) => {
                const value = point.values[series.id] ?? 0;
                const barHeight = (value / max) * innerHeight;

                return (
                  <rect
                    key={series.id}
                    x={x + 4 + seriesIndex * barWidth}
                    y={top + innerHeight - barHeight}
                    width={barWidth}
                    height={barHeight}
                    fill={SERIES_FILL[series.id] ?? "var(--color-forest)"}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <ChartTable
        columns={["Semana", ...chart.series.map((series) => series.label)]}
        rows={chart.points.map((point) => [
          point.label,
          ...chart.series.map((series) =>
            formatValue(chart.unit, point.values[series.id] ?? 0, chart.currency),
          ),
        ])}
      />
    </figure>
  );
}

function ChartTable({
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
