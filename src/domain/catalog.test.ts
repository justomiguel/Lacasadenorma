import { describe, expect, it } from "vitest";

import { remaining, isCovered, estimatedValueOf } from "./catalog";
import { DomainError } from "./errors";
import { money } from "./money";

describe("remaining", () => {
  it("descuenta lo reservado y lo entregado", () => {
    expect(remaining({ needed: 40, reserved: 3, fulfilled: 2 })).toBe(35);
  });

  it("da cero cuando está cubierto", () => {
    expect(remaining({ needed: 10, reserved: 4, fulfilled: 6 })).toBe(0);
  });

  it("nunca da negativo, aunque los contadores se pasen (FR-211)", () => {
    expect(remaining({ needed: 10, reserved: 8, fulfilled: 5 })).toBe(0);
  });

  it("rechaza una necesidad que no es positiva", () => {
    expect(() => remaining({ needed: 0, reserved: 0, fulfilled: 0 })).toThrow(
      DomainError,
    );
  });

  it("rechaza un contador negativo", () => {
    expect(() => remaining({ needed: 10, reserved: -1, fulfilled: 0 })).toThrow(
      DomainError,
    );
  });
});

describe("isCovered", () => {
  it("es verdadero sólo cuando no queda nada", () => {
    expect(isCovered({ needed: 10, reserved: 4, fulfilled: 6 })).toBe(true);
    expect(isCovered({ needed: 10, reserved: 3, fulfilled: 6 })).toBe(false);
  });
});

describe("estimatedValueOf", () => {
  it("un ítem sin valor estimado no inventa ninguno (FR-214)", () => {
    expect(estimatedValueOf(null, null)).toBeNull();
  });

  it("no convierte un nulo en cero", () => {
    expect(estimatedValueOf(null, null)).not.toEqual(money(0, "ARS"));
  });

  it("arma el monto cuando hay cantidad y moneda", () => {
    expect(estimatedValueOf(1_250_000, "ARS")).toEqual(money(1_250_000, "ARS"));
  });

  it("un monto sin moneda no es un monto", () => {
    expect(() => estimatedValueOf(1_000, null)).toThrow(DomainError);
  });
});
