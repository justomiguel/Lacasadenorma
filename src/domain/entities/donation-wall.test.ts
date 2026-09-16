import { describe, expect, it } from "vitest";

import { isPublicWallEntry } from "./donation-wall";

describe("isPublicWallEntry", () => {
  it("un sí con nombre y fecha es la línea del muro", () => {
    expect(
      isPublicWallEntry({
        status: "fulfilled",
        isAnonymous: false,
        donorDisplayName: "Ana Pérez",
        fulfilledAt: "2026-09-16T15:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("un no, una reserva o un anónimo no aparecen", () => {
    expect(
      isPublicWallEntry({
        status: "cancelled",
        isAnonymous: false,
        donorDisplayName: "Ana Pérez",
        fulfilledAt: null,
      }),
    ).toBe(false);
    expect(
      isPublicWallEntry({
        status: "reserved",
        isAnonymous: false,
        donorDisplayName: "Ana Pérez",
        fulfilledAt: null,
      }),
    ).toBe(false);
    expect(
      isPublicWallEntry({
        status: "fulfilled",
        isAnonymous: true,
        donorDisplayName: null,
        fulfilledAt: "2026-09-16T15:00:00.000Z",
      }),
    ).toBe(false);
  });
});
