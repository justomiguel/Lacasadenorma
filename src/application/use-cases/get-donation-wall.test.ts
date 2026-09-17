import { describe, expect, it } from "vitest";

import type { DonationWallEntry } from "@/src/domain/entities";

import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { getDonationWall } from "./get-donation-wall";

function entry(partial: Partial<DonationWallEntry> = {}): DonationWallEntry {
  return {
    id: crypto.randomUUID(),
    itemId: "ab700000-0000-4000-8000-000000000001",
    itemTitle: "Chapas del techo",
    quantity: 2,
    percentOfItem: 20,
    donorDisplayName: "Vecina de la esquina",
    fulfilledAt: "2026-09-12T00:00:00.000Z",
    ...partial,
  };
}

describe("getDonationWall", () => {
  it("devuelve las líneas que el puerto publica", async () => {
    const result = await getDonationWall({
      dataLayer: fakeSupabaseLayer({ wall: [entry()] }),
      logger: fakeLogger(),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.donorDisplayName).toBe("Vecina de la esquina");
  });

  it("sin nadie todavía es una lista vacía, no una falla", async () => {
    const result = await getDonationWall({
      dataLayer: fakeSupabaseLayer({ wall: [] }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "ok", data: [] });
  });

  it("sin base configurada no inventa nombres", async () => {
    const result = await getDonationWall({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });

  it("si la lectura falla lo registra y no muestra una lista vacía", async () => {
    const logger = fakeLogger();

    const result = await getDonationWall({
      dataLayer: fakeSupabaseLayer({ failWith: new Error("timeout") }),
      logger,
    });

    expect(result).toEqual({ status: "unavailable", reason: "error" });
    expect(logger.calls).toContain("error:No se pudo leer el muro de donantes");
  });
});
