import { describe, expect, it } from "vitest";

import type { CatalogClaim } from "@/src/domain/entities";

import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { getCatalogClaims } from "./get-catalog-claims";

const CLAIM: CatalogClaim = {
  id: "claim-1",
  itemId: "item-1",
  quantity: 1,
  donorDisplayName: "María",
  fulfilledAt: null,
  hasPortrait: false,
};

describe("getCatalogClaims", () => {
  it("devuelve las anotaciones con nombre", async () => {
    const result = await getCatalogClaims({
      dataLayer: fakeSupabaseLayer({ claims: [CLAIM] }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "ok", data: [CLAIM] });
  });

  it("sin base no inventa nombres", async () => {
    const result = await getCatalogClaims({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });
});
