import { formatPercentage } from "@/src/domain/percentage";
import { formatDurationSeconds } from "@/src/domain/metrics-analytics";
import type { OwnerReach } from "@/src/domain/metrics-analytics";
import { Panel } from "@/components/admin/shell";

import { MetricsBarChart, MetricsSeriesChart } from "./metrics-charts";

/**
 * Alcance leído del proveedor. Si no hay clave o la lectura falló, no se
 * dibuja: la señal de arriba ya dijo por qué (ADR-049).
 */
export function MetricsReach({ reach }: { reach: OwnerReach }) {
  if (reach.status !== "ok" || reach.headline === null) {
    return null;
  }

  const { headline } = reach;
  const series = reach.pageviews;
  const bars = [
    reach.topPages,
    reach.topSources,
    reach.devices,
    reach.browsers,
    reach.entryPages,
    reach.countries,
    reach.events,
    reach.helpOrigins,
    reach.copiedFields,
    reach.shareChannels,
    reach.paymentMedia,
  ].filter((chart) => chart !== null);

  return (
    <Panel
      id="alcance"
      title="Alcance"
      description="Los últimos treinta días según el proveedor. No hay recorridos por persona."
    >
      <dl className="grid gap-md sm:grid-cols-3">
        <Count label="Visitantes" value={headline.visitors} />
        <Count label="Vistas" value={headline.pageviews} />
        {headline.bounceRate === null ? null : (
          <Figure label="Rebote" value={formatPercentage(headline.bounceRate)} />
        )}
        {headline.visitDurationSeconds === null ? null : (
          <Figure
            label="Duración media"
            value={formatDurationSeconds(headline.visitDurationSeconds)}
          />
        )}
        {headline.helpClicks === null ? null : (
          <Count
            label="Clic en Ayudar"
            value={headline.helpClicks}
            rate={headline.helpRate}
          />
        )}
        {headline.copies === null ? null : (
          <Count label="Copió un dato" value={headline.copies} rate={headline.copyRate} />
        )}
        {headline.shares === null ? null : (
          <Count label="Compartir" value={headline.shares} rate={headline.shareRate} />
        )}
      </dl>
      {series === null && bars.length === 0 ? null : (
        <div className="mt-3xl grid gap-3xl">
          {series === null ? null : <MetricsSeriesChart chart={series} />}
          {bars.map((chart) => (
            <MetricsBarChart key={chart.id} chart={chart} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-ui text-label uppercase tracking-label text-ink-muted">
        {label}
      </dt>
      <dd className="mt-2xs font-ui text-figure text-ink">{value}</dd>
    </div>
  );
}

function Count({
  label,
  value,
  rate,
}: {
  label: string;
  value: number;
  rate?: number | null;
}) {
  return (
    <div>
      <dt className="font-ui text-label uppercase tracking-label text-ink-muted">
        {label}
      </dt>
      <dd className="mt-2xs font-ui text-body text-ink">
        {new Intl.NumberFormat("es-AR").format(value)}
        {rate === undefined || rate === null ? null : ` · ${formatPercentage(rate)}`}
      </dd>
    </div>
  );
}
