import type { AnalyticsEvent } from "./ports/analytics";
import type { BarChart, ChartPoint, MetricSignal, SeriesChart } from "./metrics";
import { countBar } from "./metrics-counts";

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
  readonly countries: readonly AnalyticsNamedCount[];
  readonly events: readonly AnalyticsNamedCount[];
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
}

export interface OwnerReach {
  readonly status: AnalyticsRead["status"];
  readonly headline: AnalyticsHeadline | null;
  readonly pageviews: SeriesChart | null;
  readonly topPages: BarChart | null;
  readonly topSources: BarChart | null;
  readonly devices: BarChart | null;
  readonly countries: BarChart | null;
  readonly events: BarChart | null;
}

const EVENT_LABELS: Record<AnalyticsEvent["name"], string> = {
  ayudar_click: "Clic en Ayudar",
  metodo_visto: "Vio un método",
  dato_copiado: "Copió un dato",
  compartir: "Compartir",
  whatsapp_click: "WhatsApp",
  llamar_click: "Llamar",
  medio_externo_click: "Medio externo",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Escritorio",
  laptop: "Portátil",
  mobile: "Teléfono",
  tablet: "Tableta",
};

const SOURCE_LABELS: Record<string, string> = {
  "(direct)": "Directo",
  direct: "Directo",
};

const QUIET_DAYS = 7;

export const EMPTY_REACH: OwnerReach = {
  status: "absent",
  headline: null,
  pageviews: null,
  topPages: null,
  topSources: null,
  devices: null,
  countries: null,
  events: null,
};

export function buildReach(read: AnalyticsRead): OwnerReach {
  if (read.status !== "ok") {
    return { ...EMPTY_REACH, status: read.status };
  }

  const { snapshot } = read;
  const helpClicks = eventTotal(snapshot.events, "ayudar_click");
  const copies = eventTotal(snapshot.events, "dato_copiado");

  return {
    status: "ok",
    headline: {
      visitors: snapshot.totals.visitors,
      pageviews: snapshot.totals.pageviews,
      bounceRate: snapshot.totals.bounceRate,
      visitDurationSeconds: snapshot.totals.visitDurationSeconds,
      helpClicks,
      copies,
    },
    pageviews: pageviewsChart(snapshot),
    topPages: namedChart("top-pages", "Páginas más vistas", snapshot.pages),
    topSources: namedChart(
      "top-sources",
      "De dónde llegan",
      snapshot.sources,
      sourceLabel,
    ),
    devices: namedChart("devices", "Aparatos", snapshot.devices, deviceLabel),
    countries: namedChart("countries", "Países", snapshot.countries),
    events: namedChart(
      "site-events",
      "Intenciones en el sitio",
      snapshot.events,
      eventLabel,
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

function pageviewsChart(snapshot: AnalyticsSnapshot): SeriesChart | null {
  if (snapshot.timeseries.every((day) => day.pageviews === 0 && day.visitors === 0)) {
    return null;
  }

  const points: ChartPoint[] = snapshot.timeseries.map((day) => ({
    key: day.date,
    label: formatDay(day.date),
    values: { visitors: day.visitors, pageviews: day.pageviews },
  }));

  return {
    id: "pageviews",
    title: `Visitantes y vistas · ${String(snapshot.periodDays)} días`,
    unit: "count",
    currency: null,
    series: [
      { id: "visitors", label: "Visitantes" },
      { id: "pageviews", label: "Vistas" },
    ],
    points,
    signals: [],
  };
}

function namedChart(
  id: string,
  title: string,
  items: readonly AnalyticsNamedCount[],
  label: (name: string) => string = (name) => name,
): BarChart | null {
  return countBar(
    id,
    title,
    items.map((item) => ({ id: item.name, label: label(item.name), value: item.value })),
    false,
  );
}

function eventTotal(
  events: readonly AnalyticsNamedCount[],
  name: AnalyticsEvent["name"],
): number | null {
  const found = events.find((item) => item.name === name);

  return found === undefined ? null : found.value;
}

function eventLabel(name: string): string {
  return EVENT_LABELS[name as AnalyticsEvent["name"]] ?? name;
}

function deviceLabel(name: string): string {
  return DEVICE_LABELS[name.toLowerCase()] ?? name;
}

function sourceLabel(name: string): string {
  const key = name.trim() === "" ? "(direct)" : name.trim().toLowerCase();

  return SOURCE_LABELS[key] ?? name;
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

function formatDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}
