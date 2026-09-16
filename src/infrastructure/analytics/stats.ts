import type {
  AnalyticsDay,
  AnalyticsNamedCount,
  AnalyticsRead,
  AnalyticsSnapshot,
  AnalyticsTotals,
} from "@/src/domain/metrics-analytics";
import type { AnalyticsStatsPort } from "@/src/domain/ports/analytics-stats";

import {
  asFinite,
  BREAKDOWN_LIMIT,
  countryLabel,
  DATE_RANGE,
  dateOf,
  PERIOD_DAYS,
  queryStats,
  type EnvBag,
  type QueryBody,
  type StatsConfig,
  type StatsFetch,
  type StatsFilter,
} from "./stats-query";

/**
 * Lectura del Stats API v2 de un proveedor compatible con Plausible (ADR-049).
 *
 * No escribe. Sin clave, dominio u origen, `absent`. Un agregado o una serie
 * que no contestan son `error`. Un desglose caído se omite, no tumba el resto.
 */

const IGNORED_EVENTS = new Set(["pageview", "pageviews"]);

export interface AnalyticsStatsOptions {
  readonly env?: EnvBag;
  readonly fetchImpl?: StatsFetch;
}

export function createAnalyticsStatsPort(
  options: AnalyticsStatsOptions = {},
): AnalyticsStatsPort {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async read(): Promise<AnalyticsRead> {
      const config = readConfig(env);

      if (config === null) {
        return { status: "absent" };
      }

      try {
        return { status: "ok", snapshot: await loadSnapshot(config, fetchImpl) };
      } catch {
        return { status: "error" };
      }
    },
  };
}

function readConfig(env: EnvBag): StatsConfig | null {
  const apiKey = env.ANALYTICS_API_KEY?.trim();
  const siteId = env.NEXT_PUBLIC_ANALYTICS_DOMAIN?.trim();
  const origin = apiOrigin(env);

  if (
    apiKey === undefined ||
    apiKey.length === 0 ||
    siteId === undefined ||
    siteId.length === 0 ||
    origin === null
  ) {
    return null;
  }

  return { apiKey, siteId, origin };
}

function apiOrigin(env: EnvBag): string | null {
  const explicit = env.ANALYTICS_API_URL?.trim();

  if (explicit !== undefined && explicit.length > 0) {
    return explicit.endsWith("/") ? explicit.slice(0, -1) : explicit;
  }

  const script = env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL?.trim();

  if (script === undefined || script.length === 0) {
    return null;
  }

  try {
    return new URL(script).origin;
  } catch {
    return null;
  }
}

async function loadSnapshot(
  config: StatsConfig,
  fetchImpl: StatsFetch,
): Promise<AnalyticsSnapshot> {
  const [
    totals,
    timeseries,
    pages,
    sources,
    devices,
    browsers,
    entryPages,
    countries,
    events,
    helpOrigins,
    copiedFields,
    shareChannels,
    paymentMedia,
  ] = await Promise.all([
    loadTotals(config, fetchImpl),
    loadTimeseries(config, fetchImpl),
    loadBreakdown(config, fetchImpl, "event:page", "pageviews"),
    loadBreakdown(config, fetchImpl, "visit:source", "visitors"),
    loadBreakdown(config, fetchImpl, "visit:device", "visitors"),
    loadBreakdown(config, fetchImpl, "visit:browser", "visitors"),
    loadBreakdown(config, fetchImpl, "visit:entry_page", "visitors"),
    loadBreakdown(config, fetchImpl, "visit:country", "visitors", countryLabel),
    loadBreakdown(config, fetchImpl, "event:goal", "events"),
    loadEventProp(config, fetchImpl, "ayudar_click", "origen"),
    loadEventProp(config, fetchImpl, "dato_copiado", "campo"),
    loadEventProp(config, fetchImpl, "compartir", "canal"),
    loadEventProp(config, fetchImpl, "medio_externo_click", "medio"),
  ]);

  return {
    periodDays: PERIOD_DAYS,
    totals,
    timeseries,
    pages,
    sources,
    devices,
    browsers,
    entryPages,
    countries,
    events: events.filter((item) => !IGNORED_EVENTS.has(item.name.toLowerCase())),
    helpOrigins,
    copiedFields,
    shareChannels,
    paymentMedia,
  };
}

async function loadTotals(
  config: StatsConfig,
  fetchImpl: StatsFetch,
): Promise<AnalyticsTotals> {
  const response = await queryStats(config, fetchImpl, {
    site_id: config.siteId,
    date_range: DATE_RANGE,
    metrics: ["visitors", "pageviews", "bounce_rate", "visit_duration"],
  });
  const row = response.results[0];
  const visitors = asFinite(row?.metrics[0]);
  const pageviews = asFinite(row?.metrics[1]);

  if (row === undefined || visitors === null || pageviews === null) {
    throw new Error("aggregate incompleto");
  }

  return {
    visitors,
    pageviews,
    bounceRate: asFinite(row.metrics[2]),
    visitDurationSeconds: asFinite(row.metrics[3]),
  };
}

async function loadTimeseries(
  config: StatsConfig,
  fetchImpl: StatsFetch,
): Promise<readonly AnalyticsDay[]> {
  const response = await queryStats(config, fetchImpl, {
    site_id: config.siteId,
    date_range: DATE_RANGE,
    metrics: ["visitors", "pageviews"],
    dimensions: ["time:day"],
    include: { time_labels: true },
  });
  const byDate = new Map<string, AnalyticsDay>();

  for (const row of response.results) {
    const date = dateOf(row.dimensions[0]);

    if (date === null) continue;

    byDate.set(date, {
      date,
      visitors: asFinite(row.metrics[0]) ?? 0,
      pageviews: asFinite(row.metrics[1]) ?? 0,
    });
  }

  const labels = response.timeLabels
    .map(dateOf)
    .filter((item): item is string => item !== null);

  if (labels.length === 0) {
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  return labels.map((date) => byDate.get(date) ?? { date, visitors: 0, pageviews: 0 });
}

async function loadEventProp(
  config: StatsConfig,
  fetchImpl: StatsFetch,
  goal: string,
  prop: string,
): Promise<readonly AnalyticsNamedCount[]> {
  return loadBreakdown(
    config,
    fetchImpl,
    `event:props:${prop}`,
    "events",
    (name) => name,
    [["is", "event:goal", [goal]]],
  );
}

async function loadBreakdown(
  config: StatsConfig,
  fetchImpl: StatsFetch,
  dimension: string,
  metric: string,
  label: (name: string) => string = (name) => name,
  filters?: readonly StatsFilter[],
): Promise<readonly AnalyticsNamedCount[]> {
  try {
    const body: QueryBody = {
      site_id: config.siteId,
      date_range: DATE_RANGE,
      metrics: [metric],
      dimensions: [dimension],
      pagination: { limit: BREAKDOWN_LIMIT },
      ...(filters === undefined ? {} : { filters }),
    };
    const response = await queryStats(config, fetchImpl, body);

    return response.results.flatMap((row) => {
      const name = typeof row.dimensions[0] === "string" ? row.dimensions[0] : null;
      const value = asFinite(row.metrics[0]);

      if (name === null || value === null) {
        return [];
      }

      return [{ name: label(name), value }];
    });
  } catch {
    return [];
  }
}
