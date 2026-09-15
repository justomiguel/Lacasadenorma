import { describe, expect, it } from "vitest";

import type { ContributionWallEntry } from "@/src/domain/entities";

import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { getContributionWall } from "./get-contribution-wall";

function entry(partial: Partial<ContributionWallEntry> = {}): ContributionWallEntry {
  return {
    id: crypto.randomUUID(),
    donorDisplayName: "Vecina que aportó",
    receivedAt: "2026-08-01",
    currency: "ARS",
    percentOfReceived: 12,
    ...partial,
  };
}

describe("getContributionWall", () => {
  it("devuelve las líneas que el puerto publica", async () => {
    const result = await getContributionWall({
      dataLayer: fakeSupabaseLayer({ moneyWall: [entry()] }),
      logger: fakeLogger(),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.donorDisplayName).toBe("Vecina que aportó");
    expect(result.data[0]?.percentOfReceived).toBe(12);
  });

  it("sin nadie todavía es una lista vacía, no una falla", async () => {
    const result = await getContributionWall({
      dataLayer: fakeSupabaseLayer({ moneyWall: [] }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "ok", data: [] });
  });

  it("sin campaña no inventa nombres", async () => {
    const result = await getContributionWall({
      dataLayer: fakeSupabaseLayer({ campaign: null, moneyWall: [entry()] }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "ok", data: [] });
  });

  it("sin base configurada no inventa nombres", async () => {
    const result = await getContributionWall({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });

  it("si la lectura falla lo registra y no muestra una lista vacía", async () => {
    const logger = fakeLogger();

    const result = await getContributionWall({
      dataLayer: fakeSupabaseLayer({ failWith: new Error("timeout") }),
      logger,
    });

    expect(result).toEqual({ status: "unavailable", reason: "error" });
    expect(logger.calls).toContain("error:No se pudo leer el muro de aportes");
  });
});
