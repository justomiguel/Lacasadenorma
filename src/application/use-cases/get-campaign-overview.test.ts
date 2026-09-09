import { describe, expect, it } from "vitest";

import { money } from "@/src/domain/money";

import {
  contentOnlyLayer,
  fakeCampaign,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { getCampaignOverview } from "./get-campaign-overview";

describe("getCampaignOverview", () => {
  it("sin base configurada informa que no está disponible, no ceros (FR-034)", async () => {
    const result = await getCampaignOverview({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });

  it("sin campaña publicada informa que no está publicada", async () => {
    const result = await getCampaignOverview({
      dataLayer: fakeSupabaseLayer({ campaign: null }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-published" });
  });

  it("devuelve el estado completo de la campaña", async () => {
    const result = await getCampaignOverview({
      dataLayer: fakeSupabaseLayer({
        received: [money(25_000_000, "ARS")],
        expenses: [
          {
            id: "e1",
            amount: money(10_000_000, "ARS"),
            spentAt: "2026-09-02",
            concept: "Chapas",
            category: "materiales",
            supplier: null,
            budgetItemId: null,
            receiptCount: 1,
            voidedAt: null,
          },
        ],
        milestones: [
          {
            id: "m1",
            title: "Techo",
            description: null,
            status: "completado",
            happenedOn: "2026-09-05",
            sortOrder: 1,
          },
        ],
      }),
      logger: fakeLogger(),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data.campaign.slug).toBe(fakeCampaign.slug);
    expect(result.data.fundraising.raised).toEqual(money(25_000_000, "ARS"));
    expect(result.data.fundraising.percent).toBe(25);
    expect(result.data.transparency.primary.spent).toEqual(money(10_000_000, "ARS"));
    expect(result.data.milestones.completedCount).toBe(1);
  });

  it("cuando la lectura falla registra el error y avisa, en lugar de mostrar vacío", async () => {
    const logger = fakeLogger();

    const result = await getCampaignOverview({
      dataLayer: fakeSupabaseLayer({ failWith: new Error("connection refused") }),
      logger,
    });

    expect(result).toEqual({ status: "unavailable", reason: "error" });
    expect(logger.calls).toContain("error:No se pudo leer el estado de la campaña");
  });

  it("registra un aviso cuando el porcentaje se sale de rango, y lo acota", async () => {
    const logger = fakeLogger();

    const result = await getCampaignOverview({
      dataLayer: fakeSupabaseLayer({
        received: [money(500_000_000, "ARS")],
      }),
      logger,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data.fundraising.percent).toBe(100);
    expect(logger.calls).toContain(
      "warn:Porcentaje fuera de rango al calcular el avance",
    );
  });
});
