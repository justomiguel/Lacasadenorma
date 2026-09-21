import { describe, expect, it } from "vitest";

import { formatTakenLine } from "./taken-names";

const COPY = {
  namedShare: "{name} · {percent}",
  namedQuantity: "{name} · {quantity} {unit}",
  units: {
    unidad: { one: "unidad", other: "unidades" },
    metro: { one: "metro", other: "metros" },
    metro_cuadrado: { one: "metro cuadrado", other: "metros cuadrados" },
    metro_cubico: { one: "metro cúbico", other: "metros cúbicos" },
    bolsa: { one: "bolsa", other: "bolsas" },
    litro: { one: "litro", other: "litros" },
    juego: { one: "juego", other: "juegos" },
  },
};

const ana = {
  name: "Ana",
  quantity: 4,
  percentOfItem: 40,
  claimId: "c1",
  hasPortrait: false,
};

describe("formatTakenLine", () => {
  it("en bolsas habla en cantidad", () => {
    expect(formatTakenLine(ana, "bolsa", COPY)).toBe("Ana · 4 bolsas");
  });

  it("en metros habla en %", () => {
    expect(formatTakenLine(ana, "metro", COPY)).toBe("Ana · 40%");
  });

  it("en una medida sin % deja el nombre", () => {
    expect(
      formatTakenLine({ ...ana, percentOfItem: null }, "litro", COPY),
    ).toBe("Ana");
  });

  it("una bolsa no pluraliza", () => {
    expect(
      formatTakenLine({ ...ana, quantity: 1 }, "bolsa", COPY),
    ).toBe("Ana · 1 bolsa");
  });
});
