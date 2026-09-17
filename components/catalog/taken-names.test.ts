import { describe, expect, it } from "vitest";

import { formatTakenNames } from "./taken-names";

const COPY = {
  namedShare: "{name} donó el {percent}",
  nameNone: "—",
};

describe("formatTakenNames", () => {
  it("sin nombres no inventa uno", () => {
    expect(formatTakenNames([], COPY)).toBe("—");
  });

  it("cinco de diez se lee como que donó el 50% de ese ítem", () => {
    expect(
      formatTakenNames([{ name: "Ana", quantity: 5, percentOfItem: 50 }], COPY),
    ).toBe("Ana donó el 50%");
  });

  it("omite el % cuando el truncado es 0 y deja el nombre", () => {
    expect(
      formatTakenNames([{ name: "Ana", quantity: 1, percentOfItem: null }], COPY),
    ).toBe("Ana");
  });
});
