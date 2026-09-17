import { describe, expect, it } from "vitest";

import {
  buildReach,
  collectReachSignals,
  formatDurationSeconds,
  type AnalyticsRead,
  type AnalyticsSnapshot,
} from "./metrics-analytics";

const NOW = new Date("2026-09-16T12:00:00.000Z");

function snapshot(partial: Partial<AnalyticsSnapshot> = {}): AnalyticsSnapshot {
  return {
    periodDays: 30,
    totals: {
      visitors: 80,
      pageviews: 140,
      bounceRate: 42,
      visitDurationSeconds: 94,
    },
    timeseries: [
      { date: "2026-09-01", visitors: 4, pageviews: 6 },
      { date: "2026-09-14", visitors: 10, pageviews: 18 },
    ],
    pages: [{ name: "/ayudar", value: 40 }],
    sources: [{ name: "(direct)", value: 25 }],
    devices: [{ name: "Mobile", value: 50 }],
    browsers: [{ name: "Chrome", value: 48 }],
    entryPages: [{ name: "/", value: 30 }],
    countries: [{ name: "Argentina", value: 60 }],
    events: [
      { name: "ayudar_click", value: 12 },
      { name: "dato_copiado", value: 5 },
      { name: "compartir", value: 4 },
    ],
    helpOrigins: [{ name: "encabezado", value: 8 }],
    copiedFields: [{ name: "cbu", value: 3 }],
    shareChannels: [{ name: "whatsapp", value: 4 }],
    paymentMedia: [{ name: "mercadopago", value: 2 }],
    ...partial,
  };
}

describe("buildReach", () => {
  it("sin proveedor no inventa ceros ni gráficos", () => {
    expect(buildReach({ status: "absent" })).toEqual(
      expect.objectContaining({
        status: "absent",
        headline: null,
        pageviews: null,
        topPages: null,
      }),
    );
  });

  it("un error tampoco finge visitas", () => {
    expect(buildReach({ status: "error" }).headline).toBeNull();
    expect(buildReach({ status: "error" }).pageviews).toBeNull();
  });

  it("con observaciones arma serie, barras y las intenciones de ADR-010", () => {
    const reach = buildReach({ status: "ok", snapshot: snapshot() });

    expect(reach.status).toBe("ok");
    expect(reach.headline).toEqual({
      visitors: 80,
      pageviews: 140,
      bounceRate: 42,
      visitDurationSeconds: 94,
      helpClicks: 12,
      copies: 5,
      shares: 4,
      helpRate: 15,
      copyRate: 6.25,
      shareRate: 5,
    });
    expect(reach.pageviews?.series.map((series) => series.id)).toEqual([
      "visitors",
      "pageviews",
    ]);
    expect(reach.topPages?.bars[0]).toEqual(
      expect.objectContaining({ label: "/ayudar", value: 40 }),
    );
    expect(reach.topSources?.bars[0]?.label).toBe("Directo");
    expect(reach.devices?.bars[0]?.label).toBe("Teléfono");
    expect(reach.browsers?.bars[0]).toEqual(
      expect.objectContaining({ label: "Chrome", value: 48 }),
    );
    expect(reach.entryPages?.bars[0]?.label).toBe("Inicio");
    expect(reach.helpOrigins?.bars[0]?.label).toBe("Encabezado");
    expect(reach.copiedFields?.bars[0]?.label).toBe("CBU");
    expect(reach.shareChannels?.bars[0]?.label).toBe("WhatsApp");
    expect(reach.paymentMedia?.bars[0]?.label).toBe("Mercado Pago");
    expect(reach.events?.bars.map((bar) => bar.label)).toEqual([
      "Clic en Ayudar",
      "Copió un dato",
      "Compartir",
    ]);
  });

  it("una serie en cero no se dibuja", () => {
    const read: AnalyticsRead = {
      status: "ok",
      snapshot: snapshot({
        timeseries: [{ date: "2026-09-01", visitors: 0, pageviews: 0 }],
        pages: [],
        sources: [],
        devices: [],
        browsers: [],
        entryPages: [],
        countries: [],
        events: [],
        helpOrigins: [],
        copiedFields: [],
        shareChannels: [],
        paymentMedia: [],
      }),
    };

    expect(buildReach(read).pageviews).toBeNull();
    expect(buildReach(read).topPages).toBeNull();
    expect(buildReach(read).events).toBeNull();
    expect(buildReach(read).browsers).toBeNull();
    expect(buildReach(read).helpOrigins).toBeNull();
  });

  it("sin visitantes no finge una tasa de 0 %", () => {
    const reach = buildReach({
      status: "ok",
      snapshot: snapshot({
        totals: {
          visitors: 0,
          pageviews: 3,
          bounceRate: null,
          visitDurationSeconds: null,
        },
        events: [{ name: "ayudar_click", value: 2 }],
      }),
    });

    expect(reach.headline?.helpClicks).toBe(2);
    expect(reach.headline?.helpRate).toBeNull();
    expect(reach.headline?.copyRate).toBeNull();
    expect(reach.headline?.shareRate).toBeNull();
  });
});

describe("collectReachSignals", () => {
  it("sin clave avisa y no finge un dato viejo", () => {
    expect(collectReachSignals({ status: "absent" }, NOW)).toEqual([
      expect.objectContaining({ id: "analytics_unconfigured", severity: "info" }),
    ]);
  });

  it("si el Stats API falla, warning y el libro no depende de esto", () => {
    expect(collectReachSignals({ status: "error" }, NOW)).toEqual([
      expect.objectContaining({ id: "analytics_unavailable", severity: "warning" }),
    ]);
  });

  it("cero vistas en siete días es quietud, no un 0 de ejemplo", () => {
    const signals = collectReachSignals(
      {
        status: "ok",
        snapshot: snapshot({
          timeseries: [
            { date: "2026-08-01", visitors: 9, pageviews: 20 },
            { date: "2026-09-16", visitors: 0, pageviews: 0 },
          ],
        }),
      },
      NOW,
    );

    expect(signals).toEqual([
      expect.objectContaining({ id: "analytics_quiet", severity: "warning" }),
    ]);
  });

  it("con vistas recientes no inventa una señal de alcance", () => {
    expect(collectReachSignals({ status: "ok", snapshot: snapshot() }, NOW)).toEqual([]);
  });
});

describe("formatDurationSeconds", () => {
  it("habla en minutos y segundos, no en un decimal", () => {
    expect(formatDurationSeconds(94)).toBe("1 min 34 s");
    expect(formatDurationSeconds(60)).toBe("1 min");
    expect(formatDurationSeconds(9)).toBe("9 s");
  });
});
