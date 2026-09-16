"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  BarChart as BarChartData,
  ChartUnit,
  SeriesChart,
} from "@/src/domain/metrics";
import type { CurrencyCode } from "@/src/domain/money";

import { ChartTable, formatChartValue, seriesFill } from "./metrics-chart-table";

const TICK = { fill: "var(--color-ink-muted)", fontSize: 14 } as const;
const SERIES_HEIGHT = 220;
const BAR_ROW = 40;
const BAR_MIN_HEIGHT = 192;

/**
 * Gráficos del tablero: Recharts con los tokens del tema, y la tabla de las
 * mismas cifras al pie (ADR-048, FR-605). Sin animación de entrada: el hover
 * es la única interactividad.
 */

export function MetricsBarChart({ chart }: { chart: BarChartData }) {
  const height = Math.max(BAR_MIN_HEIGHT, chart.bars.length * BAR_ROW);

  return (
    <figure>
      <figcaption
        id={`${chart.id}-title`}
        className="font-ui text-subheading font-medium text-ink"
      >
        {chart.title}
      </figcaption>
      <div
        role="img"
        aria-labelledby={`${chart.id}-title`}
        className="mt-md w-full"
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={120}>
          <BarChart
            accessibilityLayer
            data={[...chart.bars]}
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid stroke="var(--color-rule)" horizontal={false} />
            <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={132}
              tick={TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-sage)", fillOpacity: 0.35 }}
              isAnimationActive={false}
              content={(props) => (
                <ChartHint
                  active={props.active}
                  label={typeof props.label === "string" ? props.label : undefined}
                  payload={hintPayload(props.payload)}
                  unit={chart.unit}
                  currency={chart.currency}
                />
              )}
            />
            <Bar
              dataKey="value"
              name={chart.unit === "money" ? "Monto" : "Cantidad"}
              fill="var(--color-forest)"
              isAnimationActive={false}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        columns={["Categoría", chart.unit === "money" ? "Monto" : "Cantidad"]}
        rows={chart.bars.map((bar) => [
          bar.label,
          formatChartValue(chart.unit, bar.value, chart.currency),
        ])}
      />
    </figure>
  );
}

export function MetricsSeriesChart({ chart }: { chart: SeriesChart }) {
  const data = chart.points.map((point) => ({ label: point.label, ...point.values }));

  return (
    <figure>
      <figcaption
        id={`${chart.id}-title`}
        className="font-ui text-subheading font-medium text-ink"
      >
        {chart.title}
      </figcaption>
      <ul className="mt-xs flex flex-wrap gap-md font-ui text-caption text-ink-muted">
        {chart.series.map((series) => (
          <li key={series.id} className="inline-flex items-center gap-xs">
            <span
              className="inline-block size-sm"
              style={{ background: seriesFill(series.id) }}
              aria-hidden="true"
            />
            {series.label}
          </li>
        ))}
        {chart.signals.map((signal) => (
          <li key={signal.id}>Señal · {signal.label}</li>
        ))}
      </ul>
      <div
        role="img"
        aria-labelledby={`${chart.id}-title`}
        className="mt-md w-full"
        style={{ height: SERIES_HEIGHT }}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={120}>
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid stroke="var(--color-rule)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={TICK}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              cursor={{ fill: "var(--color-sage)", fillOpacity: 0.35 }}
              isAnimationActive={false}
              content={(props) => (
                <ChartHint
                  active={props.active}
                  label={typeof props.label === "string" ? props.label : undefined}
                  payload={hintPayload(props.payload)}
                  unit={chart.unit}
                  currency={chart.currency}
                />
              )}
            />
            {chart.signals.map((signal) => (
              <ReferenceLine
                key={signal.id}
                y={signal.value}
                stroke="var(--color-warning)"
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
              />
            ))}
            {chart.series.map((series) => (
              <Bar
                key={series.id}
                dataKey={series.id}
                name={series.label}
                fill={seriesFill(series.id)}
                isAnimationActive={false}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        columns={["Período", ...chart.series.map((series) => series.label)]}
        rows={chart.points.map((point) => [
          point.label,
          ...chart.series.map((series) =>
            formatChartValue(chart.unit, point.values[series.id] ?? 0, chart.currency),
          ),
        ])}
      />
    </figure>
  );
}

function hintPayload(
  payload: readonly { name?: unknown; value?: unknown }[] | undefined,
): readonly { name: string; value: number }[] {
  if (payload === undefined) {
    return [];
  }

  return payload.flatMap((entry) => {
    if (typeof entry.name !== "string" || typeof entry.value !== "number") {
      return [];
    }

    return [{ name: entry.name, value: entry.value }];
  });
}

function ChartHint({
  active,
  payload,
  label,
  unit,
  currency,
}: {
  active: boolean | undefined;
  payload: readonly { name: string; value: number }[];
  label: string | undefined;
  unit: ChartUnit;
  currency: CurrencyCode | null;
}) {
  if (active !== true || payload.length === 0) {
    return null;
  }

  return (
    <div className="border border-rule bg-paper px-sm py-xs font-ui text-caption text-ink">
      {label === undefined ? null : <p className="font-medium">{label}</p>}
      <ul>
        {payload.map((entry) => (
          <li key={entry.name}>
            {entry.name}: {formatChartValue(unit, entry.value, currency)}
          </li>
        ))}
      </ul>
    </div>
  );
}
