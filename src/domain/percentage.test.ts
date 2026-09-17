import { describe, expect, it, vi } from "vitest";

import { DomainError } from "./errors";
import {
  formatPercentage,
  percentage,
  ratioAsPercentage,
  shareOfItem,
  shareOfReceived,
} from "./percentage";

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

describe("shareOfReceived", () => {
  it("trunca a entero, igual que la función SQL", () => {
    expect(shareOfReceived(100_000n, 150_500n)).toBe(66);
    expect(shareOfReceived(333n, 1_000n)).toBe(33);
  });

  it("omite el 0% en lugar de publicarlo", () => {
    expect(shareOfReceived(500n, 150_500n)).toBeNull();
    expect(shareOfReceived(9n, 1_000n)).toBeNull();
  });

  it("devuelve null cuando no hay denominador", () => {
    expect(shareOfReceived(100n, 0n)).toBeNull();
    expect(shareOfReceived(100n, -1n)).toBeNull();
  });

  it("acota en 100 cuando la parte supera al total", () => {
    expect(shareOfReceived(150n, 100n)).toBe(100);
  });
});

describe("shareOfItem", () => {
  it("cinco de diez es el 50% de ese ítem (ADR-052)", () => {
    expect(shareOfItem(5, 10)).toBe(50);
  });

  it("trunca a entero", () => {
    expect(shareOfItem(1, 3)).toBe(33);
    expect(shareOfItem(2, 3)).toBe(66);
  });

  it("omite el 0% en lugar de publicarlo", () => {
    expect(shareOfItem(1, 200)).toBeNull();
  });

  it("devuelve null cuando no hay denominador", () => {
    expect(shareOfItem(5, 0)).toBeNull();
    expect(shareOfItem(5, null)).toBeNull();
    expect(shareOfItem(5, undefined)).toBeNull();
    expect(shareOfItem(0, 10)).toBeNull();
  });

  it("acota en 100 cuando la parte supera al total", () => {
    expect(shareOfItem(12, 10)).toBe(100);
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
