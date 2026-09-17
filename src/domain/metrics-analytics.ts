import type { BarChart, MetricSignal, SeriesChart } from "./metrics";
import { ratioAsPercentage } from "./percentage";
import {
  deviceLabel,
  entryPageLabel,
  eventLabel,
  eventTotal,
  fieldLabel,
  namedChart,
  originLabel,
  pageviewsChart,
  paymentLabel,
  shareLabel,
  sourceLabel,
} from "./metrics-analytics-charts";

/**
 * Totales de alcance que el proveedor ya agregó. Sin personas (ADR-010, ADR-049).
 */
export interface AnalyticsTotals {
  readonly visitors: number;
  readonly pageviews: number;
  readonly bounceRate: number | null;
  readonly visitDurationSeconds: number | null;
}

export interface AnalyticsNamedCount {
  readonly name: string;
  readonly value: number;
}

export interface AnalyticsDay {
  readonly date: string;
  readonly visitors: number;
  readonly pageviews: number;
}

export interface AnalyticsSnapshot {
  readonly periodDays: number;
  readonly totals: AnalyticsTotals;
  readonly timeseries: readonly AnalyticsDay[];
  readonly pages: readonly AnalyticsNamedCount[];
  readonly sources: readonly AnalyticsNamedCount[];
  readonly devices: readonly AnalyticsNamedCount[];
  readonly browsers: readonly AnalyticsNamedCount[];
  readonly entryPages: readonly AnalyticsNamedCount[];
  readonly countries: readonly AnalyticsNamedCount[];
  readonly events: readonly AnalyticsNamedCount[];
  readonly helpOrigins: readonly AnalyticsNamedCount[];
  readonly copiedFields: readonly AnalyticsNamedCount[];
  readonly shareChannels: readonly AnalyticsNamedCount[];
  readonly paymentMedia: readonly AnalyticsNamedCount[];
}

export type AnalyticsRead =
  | { readonly status: "absent" }
  | { readonly status: "error" }
  | { readonly status: "ok"; readonly snapshot: AnalyticsSnapshot };

export interface AnalyticsHeadline {
  readonly visitors: number;
  readonly pageviews: number;
  readonly bounceRate: number | null;
  readonly visitDurationSeconds: number | null;
  readonly helpClicks: number | null;
  readonly copies: number | null;
  readonly shares: number | null;
  readonly helpRate: number | null;
  readonly copyRate: number | null;
  readonly shareRate: number | null;
}

export interface OwnerReach {
  readonly status: AnalyticsRead["status"];
  readonly headline: AnalyticsHeadline | null;
  readonly pageviews: SeriesChart | null;
  readonly topPages: BarChart | null;
  readonly topSources: BarChart | null;
  readonly devices: BarChart | null;
  readonly browsers: BarChart | null;
  readonly entryPages: BarChart | null;
  readonly countries: BarChart | null;
  readonly events: BarChart | null;
  readonly helpOrigins: BarChart | null;
  readonly copiedFields: BarChart | null;
  readonly shareChannels: BarChart | null;
  readonly paymentMedia: BarChart | null;
}

const QUIET_DAYS = 7;

export const EMPTY_REACH: OwnerReach = {
  status: "absent",
  headline: null,
  pageviews: null,
  topPages: null,
  topSources: null,
  devices: null,
  browsers: null,
  entryPages: null,
  countries: null,
  events: null,
  helpOrigins: null,
  copiedFields: null,
  shareChannels: null,
  paymentMedia: null,
};

export function buildReach(read: AnalyticsRead): OwnerReach {
  if (read.status !== "ok") {
    return { ...EMPTY_REACH, status: read.status };
  }

  const { snapshot } = read;
  const visitors = snapshot.totals.visitors;
  const helpClicks = eventTotal(snapshot.events, "ayudar_click");
  const copies = eventTotal(snapshot.events, "dato_copiado");
  const shares = eventTotal(snapshot.events, "compartir");

  return {
    status: "ok",
    headline: {
      visitors,
      pageviews: snapshot.totals.pageviews,
      bounceRate: snapshot.totals.bounceRate,
      visitDurationSeconds: snapshot.totals.visitDurationSeconds,
      helpClicks,
      copies,
      shares,
      helpRate: rateAgainstVisitors(helpClicks, visitors),
      copyRate: rateAgainstVisitors(copies, visitors),
      shareRate: rateAgainstVisitors(shares, visitors),
    },
    pageviews: pageviewsChart(snapshot.periodDays, snapshot.timeseries),
    topPages: namedChart("top-pages", "Páginas más vistas", snapshot.pages),
    topSources: namedChart(
      "top-sources",
      "De dónde llegan",
      snapshot.sources,
      sourceLabel,
    ),
    devices: namedChart("devices", "Aparatos", snapshot.devices, deviceLabel),
    browsers: namedChart("browsers", "Navegadores", snapshot.browsers),
    entryPages: namedChart(
      "entry-pages",
      "Por dónde entran",
      snapshot.entryPages,
      entryPageLabel,
    ),
    countries: namedChart("countries", "Países", snapshot.countries),
    events: namedChart(
      "site-events",
      "Intenciones en el sitio",
      snapshot.events,
      eventLabel,
    ),
    helpOrigins: namedChart(
      "help-origins",
      "Desde dónde tocan Ayudar",
      snapshot.helpOrigins,
      originLabel,
    ),
    copiedFields: namedChart(
      "copied-fields",
      "Qué dato copian",
      snapshot.copiedFields,
      fieldLabel,
    ),
    shareChannels: namedChart(
      "share-channels",
      "Por dónde comparten",
      snapshot.shareChannels,
      shareLabel,
    ),
    paymentMedia: namedChart(
      "payment-media",
      "Medio externo",
      snapshot.paymentMedia,
      paymentLabel,
    ),
  };
}

export function collectReachSignals(
  read: AnalyticsRead,
  now: Date,
): readonly MetricSignal[] {
  if (read.status === "absent") {
    return [
      {
        id: "analytics_unconfigured",
        severity: "info",
        title: "El alcance no se lee acá",
        body: "El tablero no pide visitas a Postgres. Para verlas hace falta la clave del Stats API del proveedor, en el servidor.",
        href: "/admin",
        count: 1,
      },
    ];
  }

  if (read.status === "error") {
    return [
      {
        id: "analytics_unavailable",
        severity: "warning",
        title: "No se pudo leer el alcance",
        body: "El proveedor no contestó. El libro de la campaña sigue abajo; las visitas no se inventan.",
        href: "/admin/metricas",
        count: 1,
      },
    ];
  }

  if (recentPageviews(read.snapshot, now) === 0) {
    return [
      {
        id: "analytics_quiet",
        severity: "warning",
        title: "El sitio está quieto",
        body: "En los últimos siete días no hubo vistas medidas. Puede ser difusión, o el script.",
        href: "/admin/metricas",
        count: 1,
      },
    ];
  }

  return [];
}

export function formatDurationSeconds(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;

  if (minutes === 0) {
    return `${String(rest)} s`;
  }

  if (rest === 0) {
    return `${String(minutes)} min`;
  }

  return `${String(minutes)} min ${String(rest)} s`;
}

function rateAgainstVisitors(part: number | null, visitors: number): number | null {
  if (part === null) {
    return null;
  }

  return ratioAsPercentage(part, visitors);
}

function recentPageviews(snapshot: AnalyticsSnapshot, now: Date): number {
  const horizon = now.getTime() - QUIET_DAYS * 86_400_000;

  return snapshot.timeseries
    .filter((day) => {
      const time = new Date(`${day.date}T00:00:00.000Z`).getTime();

      return !Number.isNaN(time) && time >= horizon;
    })
    .reduce((total, day) => total + day.pageviews, 0);
}
