import { describe, expect, it } from "vitest";

import type { DonationItem } from "@/src/domain/entities";

import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { getCatalogItem } from "./get-catalog-item";

const ITEM: DonationItem = {
  id: "ab700000-0000-4000-8000-000000000003",
  campaignId: "11111111-1111-4111-8111-111111111111",
  budgetItemId: null,
  title: "Tina",
  description: "Una bañera. El baño se arma desde cero.",
  unit: "unidad",
  category: "instalaciones",
  neededQuantity: 1,
  remainingQuantity: 1,
  fulfilledQuantity: 0,
  photo: null,
  sortOrder: 10,
};

describe("getCatalogItem", () => {
  it("devuelve el ítem publicado", async () => {
    const result = await getCatalogItem({
      dataLayer: fakeSupabaseLayer({ catalog: [ITEM] }),
      logger: fakeLogger(),
      itemId: ITEM.id,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data?.title).toBe("Tina");
  });

  it("un id que no está publicado es nulo, no una falla", async () => {
    const result = await getCatalogItem({
      dataLayer: fakeSupabaseLayer({ catalog: [ITEM] }),
      logger: fakeLogger(),
      itemId: "00000000-0000-4000-8000-000000000099",
    });

    expect(result).toEqual({ status: "ok", data: null });
  });

  it("sin base no inventa una ficha", async () => {
    const result = await getCatalogItem({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
      itemId: ITEM.id,
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });
});
