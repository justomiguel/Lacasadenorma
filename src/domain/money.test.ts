import { describe, expect, it } from "vitest";

import { addMoney, formatMoney, money, subtractMoney, sumMoney } from "./money";
import { DomainError } from "./errors";

describe("money", () => {
  it("construye un monto entero en la unidad mínima", () => {
    const m = money(124_000_000, "ARS");

    expect(m.amountMinor).toBe(124_000_000);
    expect(m.currency).toBe("ARS");
  });

  it("rechaza montos no enteros, porque un centavo fraccionado no existe", () => {
    expect(() => money(10.5, "ARS")).toThrow(DomainError);
  });

  it("rechaza NaN e infinito", () => {
    expect(() => money(Number.NaN, "ARS")).toThrow(DomainError);
    expect(() => money(Number.POSITIVE_INFINITY, "ARS")).toThrow(DomainError);
  });

  it("rechaza montos que exceden el entero seguro de JavaScript", () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 2, "ARS")).toThrow(DomainError);
  });

  it("acepta cero y montos negativos, que son saldos válidos", () => {
    expect(money(0, "ARS").amountMinor).toBe(0);
    expect(money(-500, "ARS").amountMinor).toBe(-500);
  });
});

describe("addMoney", () => {
  it("suma montos de la misma moneda", () => {
    const total = addMoney(money(1000, "ARS"), money(2500, "ARS"));

    expect(total).toEqual({ amountMinor: 3500, currency: "ARS" });
  });

  it("no compila si las monedas difieren, y además falla en runtime", () => {
    // @ts-expect-error sumar monedas distintas es un error de tipos (constitución: dinero)
    expect(() => addMoney(money(1000, "ARS"), money(1000, "USD"))).toThrow(DomainError);
  });
});

describe("subtractMoney", () => {
  it("resta y admite resultado negativo", () => {
    expect(subtractMoney(money(1000, "ARS"), money(2500, "ARS"))).toEqual({
      amountMinor: -1500,
      currency: "ARS",
    });
  });
});

describe("sumMoney", () => {
  it("devuelve cero en la moneda pedida cuando la lista está vacía", () => {
    expect(sumMoney([], "ARS")).toEqual({ amountMinor: 0, currency: "ARS" });
  });

  it("suma una lista de la misma moneda", () => {
    const items = [money(100, "ARS"), money(250, "ARS"), money(1, "ARS")];

    expect(sumMoney(items, "ARS").amountMinor).toBe(351);
  });

  it("falla si un elemento no es de la moneda pedida", () => {
    const items = [money(100, "ARS"), { amountMinor: 100, currency: "USD" as const }];

    // @ts-expect-error la lista es heterogénea a propósito
    expect(() => sumMoney(items, "ARS")).toThrow(DomainError);
  });
});

describe("formatMoney", () => {
  it("formatea pesos argentinos sin decimales cuando no hay centavos", () => {
    expect(formatMoney(money(124_000_000, "ARS"))).toBe("$ 1.240.000");
  });

  it("muestra los centavos cuando existen", () => {
    expect(formatMoney(money(124_000_050, "ARS"))).toBe("$ 1.240.000,50");
  });

  it("distingue dólares de pesos en el símbolo", () => {
    expect(formatMoney(money(120_000, "USD"))).toBe("US$ 1.200");
  });

  it("trata los pesos chilenos como moneda sin decimales y no los confunde con pesos argentinos", () => {
    // El formato de es-AR escribe "CLP" en lugar de "$", y está bien: en un sitio
    // que recibe aportes de tres países, dos monedas con el mismo símbolo serían
    // un dato ambiguo.
    expect(formatMoney(money(1_200_000, "CLP"))).toBe("CLP 1.200.000");
  });
});
