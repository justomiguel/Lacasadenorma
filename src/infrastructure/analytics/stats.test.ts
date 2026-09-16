import { describe, expect, it, vi } from "vitest";

import { createAnalyticsStatsPort } from "./stats";

const ENV = {
  ANALYTICS_API_KEY: "pla_test_key_not_real",
  NEXT_PUBLIC_ANALYTICS_DOMAIN: "lacasadenorma.org",
  NEXT_PUBLIC_ANALYTICS_SCRIPT_URL: "https://plausible.io/js/script.js",
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function dimensionOf(init: RequestInit | undefined): string {
  if (typeof init?.body !== "string") {
    return "";
  }

  const body = JSON.parse(init.body) as { dimensions?: string[] };

  return body.dimensions?.[0] ?? "";
}

function okFetch() {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const dimension = dimensionOf(init);

    if (dimension === "") {
      return jsonResponse({
        results: [{ metrics: [80, 140, 42, 94], dimensions: [] }],
      });
    }

    if (dimension === "time:day") {
      return jsonResponse({
        results: [{ metrics: [10, 18], dimensions: ["2026-09-14"] }],
        meta: { time_labels: ["2026-09-13", "2026-09-14"] },
      });
    }

    if (dimension === "event:page") {
      return jsonResponse({
        results: [{ metrics: [40], dimensions: ["/ayudar"] }],
      });
    }

    if (dimension === "visit:source") {
      return jsonResponse({
        results: [{ metrics: [25], dimensions: ["Direct"] }],
      });
    }

    if (dimension === "visit:device") {
      return jsonResponse({
        results: [{ metrics: [50], dimensions: ["Mobile"] }],
      });
    }

    if (dimension === "visit:country") {
      return jsonResponse({
        results: [{ metrics: [60], dimensions: ["AR"] }],
      });
    }

    if (dimension === "event:goal") {
      return jsonResponse({
        results: [
          { metrics: [12], dimensions: ["ayudar_click"] },
          { metrics: [3], dimensions: ["pageview"] },
        ],
      });
    }

    return jsonResponse({ results: [] });
  });
}

describe("createAnalyticsStatsPort", () => {
  it("sin clave no llama al proveedor ni inventa visitas", async () => {
    const fetchImpl = vi.fn();
    const port = createAnalyticsStatsPort({
      env: { NEXT_PUBLIC_ANALYTICS_DOMAIN: "lacasadenorma.org" },
      fetchImpl,
    });

    await expect(port.read()).resolves.toEqual({ status: "absent" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sin dominio tampoco finge un snapshot", async () => {
    const port = createAnalyticsStatsPort({
      env: { ANALYTICS_API_KEY: "pla_test_key_not_real" },
      fetchImpl: okFetch(),
    });

    await expect(port.read()).resolves.toEqual({ status: "absent" });
  });

  it("lee agregados, serie y desgloses del Stats API v2", async () => {
    const fetchImpl = okFetch();
    const port = createAnalyticsStatsPort({ env: ENV, fetchImpl });
    const read = await port.read();

    expect(read.status).toBe("ok");
    if (read.status !== "ok") return;

    expect(read.snapshot.periodDays).toBe(30);
    expect(read.snapshot.totals).toEqual({
      visitors: 80,
      pageviews: 140,
      bounceRate: 42,
      visitDurationSeconds: 94,
    });
    expect(read.snapshot.timeseries).toEqual([
      { date: "2026-09-13", visitors: 0, pageviews: 0 },
      { date: "2026-09-14", visitors: 10, pageviews: 18 },
    ]);
    expect(read.snapshot.pages).toEqual([{ name: "/ayudar", value: 40 }]);
    expect(read.snapshot.devices).toEqual([{ name: "Mobile", value: 50 }]);
    expect(read.snapshot.countries[0]?.name).toBe("Argentina");
    expect(read.snapshot.events.map((item) => item.name)).toEqual(["ayudar_click"]);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://plausible.io/api/v2/query");
    expect(init.headers).toEqual({
      Authorization: "Bearer pla_test_key_not_real",
      "Content-Type": "application/json",
    });
  });

  it("ANALYTICS_API_URL gana al origen del script", async () => {
    const fetchImpl = okFetch();
    const port = createAnalyticsStatsPort({
      env: { ...ENV, ANALYTICS_API_URL: "https://analytics.example" },
      fetchImpl,
    });

    await port.read();

    const [url] = fetchImpl.mock.calls[0] as [string];

    expect(url).toBe("https://analytics.example/api/v2/query");
  });

  it("un 401 en el agregado es error, no un cero", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (dimensionOf(init) === "") {
        return jsonResponse({ error: "Invalid API key" }, 401);
      }

      return jsonResponse({ results: [] });
    });

    const port = createAnalyticsStatsPort({ env: ENV, fetchImpl });

    await expect(port.read()).resolves.toEqual({ status: "error" });
  });

  it("un desglose caído queda vacío y el resto se muestra", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const dimension = dimensionOf(init);

      if (dimension === "event:page") {
        return jsonResponse({ error: "boom" }, 500);
      }

      if (dimension === "") {
        return jsonResponse({
          results: [{ metrics: [4, 6, null, null], dimensions: [] }],
        });
      }

      if (dimension === "time:day") {
        return jsonResponse({
          results: [{ metrics: [4, 6], dimensions: ["2026-09-16"] }],
        });
      }

      return jsonResponse({ results: [] });
    });

    const port = createAnalyticsStatsPort({ env: ENV, fetchImpl });
    const read = await port.read();

    expect(read.status).toBe("ok");
    if (read.status !== "ok") return;

    expect(read.snapshot.pages).toEqual([]);
    expect(read.snapshot.totals.visitors).toBe(4);
    expect(read.snapshot.totals.bounceRate).toBeNull();
  });
});
