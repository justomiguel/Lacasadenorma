import type {
  AnalyticsDay,
  AnalyticsNamedCount,
  AnalyticsRead,
  AnalyticsSnapshot,
  AnalyticsTotals,
} from "@/src/domain/metrics-analytics";
import type { AnalyticsStatsPort } from "@/src/domain/ports/analytics-stats";

/**
 * Lectura del Stats API v2 de un proveedor compatible con Plausible (ADR-049).
 *
 * No escribe. Sin clave, dominio u origen, `absent`. Un agregado o una serie
 * que no contestan son `error`. Un desglose caído se omite, no tumba el resto.
 */

const PERIOD_DAYS = 30;
const DATE_RANGE = "30d";
const BREAKDOWN_LIMIT = 8;
const TIMEOUT_MS = 10_000;
const IGNORED_EVENTS = new Set(["pageview", "pageviews"]);

type EnvBag = Readonly<Record<string, string | undefined>>;
type StatsFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface AnalyticsStatsOptions {
  readonly env?: EnvBag;
  readonly fetchImpl?: StatsFetch;
}

interface StatsConfig {
  readonly origin: string;
  readonly apiKey: string;
  readonly siteId: string;
}

interface QueryBody {
  readonly site_id: string;
  readonly date_range: string;
  readonly metrics: readonly string[];
  readonly dimensions?: readonly string[];
  readonly include?: Readonly<Record<string, boolean>>;
  readonly pagination?: { readonly limit: number };
}

interface QueryRow {
  readonly metrics: readonly unknown[];
  readonly dimensions: readonly unknown[];
}

interface QueryResponse {
  readonly results: readonly QueryRow[];
  readonly timeLabels: readonly string[];
}

const COUNTRY_NAMES = new Intl.DisplayNames(["es-AR"], { type: "region" });

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
  const [totals, timeseries, pages, sources, devices, countries, events] =
    await Promise.all([
      loadTotals(config, fetchImpl),
      loadTimeseries(config, fetchImpl),
      loadBreakdown(config, fetchImpl, "event:page", "pageviews"),
      loadBreakdown(config, fetchImpl, "visit:source", "visitors"),
      loadBreakdown(config, fetchImpl, "visit:device", "visitors"),
      loadBreakdown(config, fetchImpl, "visit:country", "visitors", countryLabel),
      loadBreakdown(config, fetchImpl, "event:goal", "events"),
    ]);

  return {
    periodDays: PERIOD_DAYS,
    totals,
    timeseries,
    pages,
    sources,
    devices,
    countries,
    events: events.filter((item) => !IGNORED_EVENTS.has(item.name.toLowerCase())),
  };
}

async function loadTotals(
  config: StatsConfig,
  fetchImpl: StatsFetch,
): Promise<AnalyticsTotals> {
  const response = await query(config, fetchImpl, {
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
  const response = await query(config, fetchImpl, {
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

async function loadBreakdown(
  config: StatsConfig,
  fetchImpl: StatsFetch,
  dimension: string,
  metric: string,
  label: (name: string) => string = (name) => name,
): Promise<readonly AnalyticsNamedCount[]> {
  try {
    const response = await query(config, fetchImpl, {
      site_id: config.siteId,
      date_range: DATE_RANGE,
      metrics: [metric],
      dimensions: [dimension],
      pagination: { limit: BREAKDOWN_LIMIT },
    });

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

async function query(
  config: StatsConfig,
  fetchImpl: StatsFetch,
  body: QueryBody,
): Promise<QueryResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${config.origin}/api/v2/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Stats API ${String(response.status)}`);
    }

    return asQueryResponse(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

function asQueryResponse(payload: unknown): QueryResponse {
  if (!isRecord(payload) || !Array.isArray(payload["results"])) {
    throw new Error("respuesta irreconocible");
  }

  const results: QueryRow[] = payload["results"].map((row) => {
    if (!isRecord(row)) {
      return { metrics: [], dimensions: [] };
    }

    return {
      metrics: Array.isArray(row["metrics"]) ? row["metrics"] : [],
      dimensions: Array.isArray(row["dimensions"]) ? row["dimensions"] : [],
    };
  });

  const meta = payload["meta"];
  const rawLabels = isRecord(meta) ? meta["time_labels"] : undefined;
  const timeLabels = Array.isArray(rawLabels)
    ? rawLabels.filter((item): item is string => typeof item === "string")
    : [];

  return { results, timeLabels };
}

function countryLabel(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) {
    return code;
  }

  return COUNTRY_NAMES.of(code.toUpperCase()) ?? code;
}

function asFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateOf(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 10) {
    return null;
  }

  const date = value.slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
