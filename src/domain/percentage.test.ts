import { describe, expect, it, vi } from "vitest";

import { DomainError } from "./errors";
import { formatPercentage, percentage, ratioAsPercentage } from "./percentage";

describe("percentage", () => {
  it("acepta valores dentro del rango", () => {
    expect(percentage(42.5)).toBe(42.5);
  });

  it("acota por arriba y por abajo", () => {
    expect(percentage(140)).toBe(100);
    expect(percentage(-3)).toBe(0);
  });

  it("avisa cuando el valor venía fuera de rango, en lugar de acotar en silencio", () => {
    const onOutOfRange = vi.fn();

    percentage(140, onOutOfRange);

    expect(onOutOfRange).toHaveBeenCalledWith(140);
  });

  it("no avisa cuando el valor estaba en rango", () => {
    const onOutOfRange = vi.fn();

    percentage(50, onOutOfRange);

    expect(onOutOfRange).not.toHaveBeenCalled();
  });

  it("rechaza valores que no son números finitos", () => {
    expect(() => percentage(Number.NaN)).toThrow(DomainError);
    expect(() => percentage(Number.POSITIVE_INFINITY)).toThrow(DomainError);
  });
});

describe("ratioAsPercentage", () => {
  it("calcula el porcentaje de una parte sobre un total", () => {
    expect(ratioAsPercentage(25, 200)).toBe(12.5);
  });

  it("devuelve null cuando no hay denominador, en lugar de cero", () => {
    expect(ratioAsPercentage(25, null)).toBeNull();
  });

  it("devuelve null cuando el denominador es cero", () => {
    expect(ratioAsPercentage(25, 0)).toBeNull();
  });

  it("acota cuando la parte supera al total", () => {
    expect(ratioAsPercentage(300, 200)).toBe(100);
  });
});

describe("formatPercentage", () => {
  it("redondea a entero y usa el separador de es-AR", () => {
    expect(formatPercentage(12.5)).toBe("13%");
    expect(formatPercentage(0)).toBe("0%");
    expect(formatPercentage(100)).toBe("100%");
  });

  it("permite un decimal cuando se pide", () => {
    expect(formatPercentage(12.54, { decimals: 1 })).toBe("12,5%");
  });
});
