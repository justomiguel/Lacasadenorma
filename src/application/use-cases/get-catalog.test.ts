import { describe, expect, it } from "vitest";

import type { DonationItem } from "@/src/domain/entities";

import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { getCatalog } from "./get-catalog";

function item(partial: Partial<DonationItem> = {}): DonationItem {
  return {
    id: crypto.randomUUID(),
    campaignId: "11111111-1111-4111-8111-111111111111",
    budgetItemId: null,
    title: "Chapas del techo",
    description: "Chapa sinusoidal calibre 25, de 3,66 m.",
    unit: "unidad",
    category: "materiales",
    neededQuantity: 40,
    remainingQuantity: 35,
    fulfilledQuantity: 2,
    estimatedValue: null,
    photo: null,
    sortOrder: 10,
    ...partial,
  };
}

describe("getCatalog", () => {
  it("devuelve los ítems que el puerto publica", async () => {
    const result = await getCatalog({
      dataLayer: fakeSupabaseLayer({ catalog: [item()] }),
      logger: fakeLogger(),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.title).toBe("Chapas del techo");
    expect(result.data[0]?.remainingQuantity).toBe(35);
  });

  it("sin ítems todavía es una lista vacía, no una falla", async () => {
    const result = await getCatalog({
      dataLayer: fakeSupabaseLayer({ catalog: [] }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "ok", data: [] });
  });

  it("sin base configurada no dice que no falta nada: dice que no sabe", async () => {
    const result = await getCatalog({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });

  it("sin campaña publicada distingue el motivo", async () => {
    const result = await getCatalog({
      dataLayer: fakeSupabaseLayer({ campaign: null }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-published" });
  });

  it("si la lectura falla lo registra y no inventa un catálogo vacío", async () => {
    const logger = fakeLogger();

    const result = await getCatalog({
      dataLayer: fakeSupabaseLayer({ failWith: new Error("timeout") }),
      logger,
    });

    expect(result).toEqual({ status: "unavailable", reason: "error" });
    expect(logger.calls).toContain("error:No se pudo leer el catálogo");
  });
});
