import { describe, expect, it } from "vitest";

import { money } from "./money";
import { EMPTY_METRICS_FACTS, type MetricsCampaign, type MetricsFacts } from "./metrics";
import { buildOwnerMetrics } from "./metrics-build";

const NOW = new Date("2026-09-16T12:00:00.000Z");
const CAMPAIGN: MetricsCampaign = {
  goal: money(1_000_000_00, "ARS"),
  reconciledAt: "2026-09-01T00:00:00.000Z",
};

function facts(partial: Partial<MetricsFacts> = {}): MetricsFacts {
  return { ...EMPTY_METRICS_FACTS, ...partial };
}

describe("buildOwnerMetrics", () => {
  it("sin movimientos el libro es cero observado y no dibuja gráficos", () => {
    const metrics = buildOwnerMetrics(CAMPAIGN, facts(), NOW);

    expect(metrics.headline.received).toEqual(money(0, "ARS"));
    expect(metrics.headline.spent).toEqual(money(0, "ARS"));
    expect(metrics.headline.raisedPercent).toBe(0);
    expect(metrics.headline.executedPercent).toBeNull();
    expect(metrics.weeklyCash).toBeNull();
    expect(metrics.cumulativeRaised).toBeNull();
    expect(metrics.expensesByCategory).toBeNull();
  });

  it("suma aportes y gastos vivos en la moneda del objetivo, y deja afuera los anulados", () => {
    const metrics = buildOwnerMetrics(
      CAMPAIGN,
      facts({
        contributions: [
          {
            amountMinor: 400_000_00,
            currency: "ARS",
            receivedAt: "2026-09-01",
            voidedAt: null,
          },
          {
            amountMinor: 50_000_00,
            currency: "ARS",
            receivedAt: "2026-09-02",
            voidedAt: "2026-09-03T00:00:00.000Z",
          },
          {
            amountMinor: 100_00,
            currency: "USD",
            receivedAt: "2026-09-04",
            voidedAt: null,
          },
        ],
        expenses: [
          {
            amountMinor: 100_000_00,
            currency: "ARS",
            spentAt: "2026-09-05",
            category: "materiales",
            receiptCount: 1,
            voidedAt: null,
            publishedAt: "2026-09-05T00:00:00.000Z",
          },
          {
            amountMinor: 10_000_00,
            currency: "ARS",
            spentAt: "2026-09-06",
            category: "servicios",
            receiptCount: 0,
            voidedAt: "2026-09-07T00:00:00.000Z",
            publishedAt: null,
          },
        ],
      }),
      NOW,
    );

    expect(metrics.headline.received).toEqual(money(400_000_00, "ARS"));
    expect(metrics.headline.spent).toEqual(money(100_000_00, "ARS"));
    expect(metrics.headline.balance).toEqual(money(300_000_00, "ARS"));
    expect(metrics.headline.raisedPercent).toBe(40);
    expect(metrics.headline.executedPercent).toBe(25);
    expect(metrics.headline.otherCurrencies).toEqual([money(100_00, "USD")]);
    expect(metrics.headline.liveContributionCount).toBe(2);
    expect(metrics.headline.liveExpenseCount).toBe(1);
  });

  it("el flujo semanal no mezcla monedas y marca el promedio de lo recibido", () => {
    const metrics = buildOwnerMetrics(
      CAMPAIGN,
      facts({
        contributions: [
          {
            amountMinor: 200_000_00,
            currency: "ARS",
            receivedAt: "2026-09-14",
            voidedAt: null,
          },
          {
            amountMinor: 100_000_00,
            currency: "ARS",
            receivedAt: "2026-08-31",
            voidedAt: null,
          },
        ],
        expenses: [
          {
            amountMinor: 50_000_00,
            currency: "ARS",
            spentAt: "2026-09-15",
            category: "materiales",
            receiptCount: 1,
            voidedAt: null,
            publishedAt: "2026-09-15T00:00:00.000Z",
          },
        ],
      }),
      NOW,
    );

    expect(metrics.weeklyCash).not.toBeNull();
    expect(metrics.weeklyCash?.points).toHaveLength(12);
    expect(metrics.weeklyCash?.signals[0]?.id).toBe("average_inflow");

    const last = metrics.weeklyCash?.points.at(-1);
    expect(last?.values["inflow"]).toBe(200_000_00);
    expect(last?.values["outflow"]).toBe(50_000_00);

    const usdWeek = metrics.weeklyCash?.points.find(
      (point) => point.values["inflow"] === 0,
    );
    expect(usdWeek).toBeDefined();

    expect(metrics.cumulativeRaised?.signals[0]).toEqual(
      expect.objectContaining({ id: "goal", value: 1_000_000_00 }),
    );
    expect(metrics.cumulativeRaised?.points.at(-1)?.values["raised"]).toBe(300_000_00);
  });

  it("gastos por categoría omiten las que no se usaron y no convierten", () => {
    const metrics = buildOwnerMetrics(
      CAMPAIGN,
      facts({
        expenses: [
          {
            amountMinor: 80_000_00,
            currency: "ARS",
            spentAt: "2026-09-02",
            category: "materiales",
            receiptCount: 1,
            voidedAt: null,
            publishedAt: "2026-09-02T00:00:00.000Z",
          },
          {
            amountMinor: 20_000_00,
            currency: "ARS",
            spentAt: "2026-09-03",
            category: "transporte",
            receiptCount: 1,
            voidedAt: null,
            publishedAt: "2026-09-03T00:00:00.000Z",
          },
        ],
      }),
      NOW,
    );

    expect(metrics.expensesByCategory?.bars.map((bar) => bar.id)).toEqual([
      "materiales",
      "transporte",
    ]);
  });

  it("el pipeline de reservas incluye los estados en cero cuando hay alguna", () => {
    const metrics = buildOwnerMetrics(
      CAMPAIGN,
      facts({
        pledges: [
          {
            status: "reserved",
            quantity: 2,
            coverChannel: "bring",
            expiresAt: "2026-09-30T00:00:00.000Z",
            remindedAt: null,
          },
          {
            status: "fulfilled",
            quantity: 1,
            coverChannel: "transfer",
            expiresAt: "2026-09-01T00:00:00.000Z",
            remindedAt: null,
          },
        ],
      }),
      NOW,
    );

    expect(metrics.pledgePipeline?.bars).toEqual([
      expect.objectContaining({ id: "reserved", value: 1 }),
      expect.objectContaining({ id: "accepted", value: 0 }),
      expect.objectContaining({ id: "fulfilled", value: 1 }),
      expect.objectContaining({ id: "cancelled", value: 0 }),
      expect.objectContaining({ id: "expired", value: 0 }),
    ]);
    expect(metrics.pledgesByChannel?.bars.map((bar) => bar.id).sort()).toEqual([
      "bring",
      "transfer",
    ]);
  });

  it("el catálogo se mide en unidades, no en pesos", () => {
    const metrics = buildOwnerMetrics(
      CAMPAIGN,
      facts({
        catalog: [
          {
            needed: 10,
            reserved: 3,
            fulfilled: 2,
            publishedAt: "2026-09-01T00:00:00.000Z",
            category: "materiales",
          },
          {
            needed: 4,
            reserved: 0,
            fulfilled: 4,
            publishedAt: "2026-09-01T00:00:00.000Z",
            category: "aberturas",
          },
        ],
      }),
      NOW,
    );

    expect(metrics.catalogCoverage?.bars).toEqual([
      expect.objectContaining({ id: "fulfilled", value: 6 }),
      expect.objectContaining({ id: "reserved", value: 3 }),
      expect.objectContaining({ id: "remaining", value: 5 }),
    ]);
    expect(metrics.catalogCoverage?.unit).toBe("count");
  });

  it("un gasto no publicado cuenta en el libro interno y en el conteo", () => {
    const metrics = buildOwnerMetrics(
      CAMPAIGN,
      facts({
        expenses: [
          {
            amountMinor: 10_000_00,
            currency: "ARS",
            spentAt: "2026-09-02",
            category: "otros",
            receiptCount: 0,
            voidedAt: null,
            publishedAt: null,
          },
        ],
      }),
      NOW,
    );

    expect(metrics.headline.spent).toEqual(money(10_000_00, "ARS"));
    expect(metrics.headline.unpublishedExpenseCount).toBe(1);
  });

  it("un fallo de alcance no esconde el libro ni inventa visitas", () => {
    const metrics = buildOwnerMetrics(
      CAMPAIGN,
      facts({
        contributions: [
          {
            amountMinor: 10_000_00,
            currency: "ARS",
            receivedAt: "2026-09-02",
            voidedAt: null,
          },
        ],
        paymentMethods: [{ publishedAt: "2026-09-01T00:00:00.000Z" }],
      }),
      NOW,
      { status: "error" },
    );

    expect(metrics.headline.received).toEqual(money(10_000_00, "ARS"));
    expect(metrics.reach.status).toBe("error");
    expect(metrics.reach.headline).toBeNull();
    expect(metrics.signals.some((signal) => signal.id === "analytics_unavailable")).toBe(
      true,
    );
  });
});
