import { formatMoney } from "@/src/domain/money";
import { formatPercentage } from "@/src/domain/percentage";
import type { OwnerMetrics } from "@/src/domain/metrics";
import { EmptyState } from "@/components/design-system/callout";
import { Panel } from "@/components/admin/shell";

import { MetricsBarChart, MetricsSeriesChart } from "./metrics-charts";
import { MetricsReach } from "./metrics-reach";
import { MetricsSignalList } from "./metrics-signals";

/**
 * El tablero: señales, libro, gráficos. Un gráfico nulo no se dibuja.
 */
export function MetricsBoard({ metrics }: { metrics: OwnerMetrics }) {
  const { headline } = metrics;
  const charts = [
    metrics.weeklyCash,
    metrics.cumulativeRaised,
    metrics.expensesByCategory,
    metrics.pledgePipeline,
    metrics.pledgesByChannel,
    metrics.catalogCoverage,
    metrics.catalogByCategory,
    metrics.donorApprovals,
    metrics.emailHealth,
    metrics.milestoneProgress,
    metrics.newsCadence,
  ];
  const series = charts.filter(isSeries);
  const bars = charts.filter(isBar);
  const hasCharts = series.length > 0 || bars.length > 0;

  return (
    <>
      <Panel id="senales" title="Señales" tone="sunk">
        <MetricsSignalList
          signals={metrics.signals}
          empty="No hay excepciones pendientes. El tablero sigue mostrando el libro y los gráficos de lo que sí se midió."
        />
      </Panel>

      <Panel id="libro" title="El libro">
        <dl className="grid gap-lg sm:grid-cols-3">
          <Figure label="Recibido" value={formatMoney(headline.received)} />
          <Figure label="Gastado" value={formatMoney(headline.spent)} />
          <Figure label="Saldo" value={formatMoney(headline.balance)} />
        </dl>
        <p className="mt-lg font-ui text-small text-ink-muted">
          {headline.goal === null
            ? "Todavía no hay objetivo interno. Si lo cargás en Objetivo, el acumulado marca esa señal."
            : `Objetivo interno (no se publica): ${formatMoney(headline.goal)}${
                headline.raisedPercent === null
                  ? "."
                  : ` · ${formatPercentage(headline.raisedPercent)} de esa meta.`
              }`}
          {headline.executedPercent === null
            ? " Todavía no hay recibido para decir qué parte se usó."
            : ` Se usó el ${formatPercentage(headline.executedPercent)} de lo que ya llegó.`}
        </p>
        {headline.otherCurrencies.length === 0 ? null : (
          <p className="mt-sm font-ui text-small text-ink-muted">
            También hay movimientos en{" "}
            {headline.otherCurrencies.map((amount) => formatMoney(amount)).join(", ")}. No
            se convierten.
          </p>
        )}
        <dl className="mt-lg grid gap-md sm:grid-cols-4">
          <Count label="Aportes vivos" value={headline.liveContributionCount} />
          <Count label="Gastos vivos" value={headline.liveExpenseCount} />
          <Count label="Reservas en curso" value={headline.activePledgeCount} />
          <Count label="Cuentas por revisar" value={headline.pendingDonorCount} />
        </dl>
      </Panel>

      <MetricsReach reach={metrics.reach} />

      {hasCharts ? (
        <Panel id="graficos" title="Lo medible">
          <div className="grid gap-3xl">
            {series.map((chart) => (
              <MetricsSeriesChart key={chart.id} chart={chart} />
            ))}
            {bars.map((chart) => (
              <MetricsBarChart key={chart.id} chart={chart} />
            ))}
          </div>
        </Panel>
      ) : (
        <EmptyState title="Todavía no hay movimientos para graficar">
          <p>
            El libro está en cero observado. Cuando se anote un aporte, un gasto, una
            reserva o un ítem del catálogo, acá aparece el gráfico. Las señales de
            operación, si las hay, ya están arriba.
          </p>
        </EmptyState>
      )}
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-ui text-label uppercase tracking-label text-ink-muted">
        {label}
      </dt>
      <dd data-figure className="mt-2xs font-ui text-figure text-ink">
        {value}
      </dd>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-ui text-label uppercase tracking-label text-ink-muted">
        {label}
      </dt>
      <dd className="mt-2xs font-ui text-body text-ink">{value}</dd>
    </div>
  );
}

function isSeries(
  chart: OwnerMetrics["weeklyCash"] | OwnerMetrics["expensesByCategory"],
): chart is NonNullable<OwnerMetrics["weeklyCash"]> {
  return chart !== null && "points" in chart;
}

function isBar(
  chart: OwnerMetrics["weeklyCash"] | OwnerMetrics["expensesByCategory"],
): chart is NonNullable<OwnerMetrics["expensesByCategory"]> {
  return chart !== null && "bars" in chart;
}
