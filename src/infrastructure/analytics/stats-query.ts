/**
 * Cliente HTTP del Stats API v2. Un desglose caído lo maneja quien llama.
 */

export const DATE_RANGE = "30d";
export const BREAKDOWN_LIMIT = 8;
export const PERIOD_DAYS = 30;

const TIMEOUT_MS = 10_000;
const COUNTRY_NAMES = new Intl.DisplayNames(["es-AR"], { type: "region" });

export type EnvBag = Readonly<Record<string, string | undefined>>;
export type StatsFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface StatsConfig {
  readonly origin: string;
  readonly apiKey: string;
  readonly siteId: string;
}

export type StatsFilter = readonly [string, string, readonly string[]];

export interface QueryBody {
  readonly site_id: string;
  readonly date_range: string;
  readonly metrics: readonly string[];
  readonly dimensions?: readonly string[];
  readonly filters?: readonly StatsFilter[];
  readonly include?: Readonly<Record<string, boolean>>;
  readonly pagination?: { readonly limit: number };
}

export interface QueryRow {
  readonly metrics: readonly unknown[];
  readonly dimensions: readonly unknown[];
}

export interface QueryResponse {
  readonly results: readonly QueryRow[];
  readonly timeLabels: readonly string[];
}

export async function queryStats(
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

export function countryLabel(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) {
    return code;
  }

  return COUNTRY_NAMES.of(code.toUpperCase()) ?? code;
}

export function asFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function dateOf(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 10) {
    return null;
  }

  const date = value.slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
