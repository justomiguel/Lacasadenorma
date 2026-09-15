import { describe, expect, it } from "vitest";

import {
  COVER_CHANNELS,
  extraOrZero,
  isCoverChannel,
  mercadoPagoTotal,
  netCoverAmount,
  suggestedCoverAmount,
  withMercadoPagoFee,
} from "./cover";
import { DomainError } from "./errors";
import { money } from "./money";

describe("isCoverChannel", () => {
  it("acepta los cuatro canales y nada más", () => {
    expect(COVER_CHANNELS).toEqual(["bring", "transfer", "mercadopago", "paypal"]);
    expect(isCoverChannel("paypal")).toBe(true);
    expect(isCoverChannel("card")).toBe(false);
  });
});

describe("withMercadoPagoFee", () => {
  it("suma el 10% en enteros, sin float", () => {
    expect(withMercadoPagoFee(money(10_000, "ARS"))).toEqual(money(11_000, "ARS"));
  });

  it("trunca el resto: no inventa el último centavo", () => {
    expect(withMercadoPagoFee(money(1, "ARS"))).toEqual(money(1, "ARS"));
    expect(withMercadoPagoFee(money(15, "ARS"))).toEqual(money(16, "ARS"));
  });

  it("rechaza un neto negativo", () => {
    expect(() => withMercadoPagoFee(money(-100, "ARS"))).toThrow(DomainError);
  });
});

describe("suggestedCoverAmount", () => {
  const unit = money(10_000, "ARS");

  it("traer el objeto no sugiere un monto", () => {
    expect(suggestedCoverAmount(unit, 2, "bring")).toBeNull();
  });

  it("transferencia y PayPal usan el neto, sin el recargo", () => {
    expect(suggestedCoverAmount(unit, 2, "transfer")).toEqual(money(20_000, "ARS"));
    expect(suggestedCoverAmount(unit, 2, "paypal")).toEqual(money(20_000, "ARS"));
  });

  it("Mercado Pago suma el 10% sobre el neto de la cantidad", () => {
    expect(suggestedCoverAmount(unit, 2, "mercadopago")).toEqual(money(22_000, "ARS"));
  });
});

describe("mercadoPagoTotal", () => {
  const unit = money(10_000, "ARS");

  it("sin extra extra es el sugerido con recargo", () => {
    expect(mercadoPagoTotal(unit, 1, money(0, "ARS"))).toEqual(money(11_000, "ARS"));
  });

  it("permite sumar más, nunca restar", () => {
    expect(mercadoPagoTotal(unit, 1, money(500, "ARS"))).toEqual(money(11_500, "ARS"));
    expect(() => mercadoPagoTotal(unit, 1, money(-1, "ARS"))).toThrow(DomainError);
  });

  it("no mezcla monedas", () => {
    // @ts-expect-error extra en otra moneda
    expect(() => mercadoPagoTotal(unit, 1, money(500, "USD"))).toThrow(DomainError);
  });
});

describe("netCoverAmount", () => {
  it("multiplica el estimado de unidad por un entero positivo", () => {
    expect(netCoverAmount(money(1_500, "ARS"), 3)).toEqual(money(4_500, "ARS"));
  });

  it("rechaza una cantidad que no es un entero positivo", () => {
    expect(() => netCoverAmount(money(1_000, "ARS"), 0)).toThrow(DomainError);
    expect(() => netCoverAmount(money(1_000, "ARS"), 1.5)).toThrow(DomainError);
  });
});

describe("extraOrZero", () => {
  it("vacío es cero, no un estimado inventado", () => {
    expect(extraOrZero("", "ARS")).toEqual(money(0, "ARS"));
    expect(extraOrZero("  ", "CLP")).toEqual(money(0, "CLP"));
  });

  it("parsea el extra con la misma regla que el backoffice", () => {
    expect(extraOrZero("1.200", "ARS")).toEqual(money(120_000, "ARS"));
  });
});
