import { describe, expect, it } from "vitest";

import { AmountFormatError, amountToInputValue, parseAmount } from "./money-input";

describe("parseAmount", () => {
  it("lee un monto sin separadores", () => {
    expect(parseAmount("1240000", "ARS")).toEqual({
      amountMinor: 124000000,
      currency: "ARS",
    });
  });

  it("lee el punto como separador de miles", () => {
    expect(parseAmount("1.240.000", "ARS").amountMinor).toBe(124000000);
  });

  it("lee la coma como separador decimal", () => {
    expect(parseAmount("1240,50", "ARS").amountMinor).toBe(124050);
  });

  it("completa un solo decimal a la unidad mínima", () => {
    expect(parseAmount("10,5", "ARS").amountMinor).toBe(1050);
  });

  it("ignora el símbolo de moneda y los espacios, incluido el fino", () => {
    expect(parseAmount("$ 1.240.000", "ARS").amountMinor).toBe(124000000);
    expect(parseAmount("1\u202f240\u202f000", "ARS").amountMinor).toBe(124000000);
  });

  /**
   * La regla más importante del archivo. Si el punto se leyera como decimal,
   * "1.500" pasaría de mil quinientos pesos a uno con cincuenta, y la
   * transparencia publicaría la cifra equivocada sin que nada falle.
   */
  it("trata el punto como miles y no como decimal", () => {
    expect(parseAmount("1.500", "ARS").amountMinor).toBe(150000);
  });

  it("rechaza un monto vacío", () => {
    expect(() => parseAmount("   ", "ARS")).toThrow(AmountFormatError);
  });

  it("rechaza texto que no es un número", () => {
    expect(() => parseAmount("mil quinientos", "ARS")).toThrow(AmountFormatError);
    expect(() => parseAmount("1.2e5", "ARS")).toThrow(AmountFormatError);
  });

  it("rechaza grupos de miles mal formados", () => {
    expect(() => parseAmount("1.24.000", "ARS")).toThrow(AmountFormatError);
  });

  it("rechaza un negativo: un gasto se anula, no se carga en negativo", () => {
    expect(() => parseAmount("-1000", "ARS")).toThrow(AmountFormatError);
  });

  it("rechaza más decimales que los que admite la moneda", () => {
    expect(() => parseAmount("10,555", "ARS")).toThrow(AmountFormatError);
  });

  it("rechaza centavos en una moneda que no los tiene", () => {
    expect(() => parseAmount("1200,5", "CLP")).toThrow(AmountFormatError);
    expect(parseAmount("1200", "CLP").amountMinor).toBe(1200);
  });

  it("acepta cero, que es un monto válido para un rubro sin cotizar", () => {
    expect(parseAmount("0", "ARS").amountMinor).toBe(0);
  });
});

describe("amountToInputValue", () => {
  it("devuelve el monto editable sin separador de miles", () => {
    expect(amountToInputValue({ amountMinor: 124000000, currency: "ARS" })).toBe(
      "1240000",
    );
  });

  it("muestra los centavos sólo cuando existen", () => {
    expect(amountToInputValue({ amountMinor: 124050, currency: "ARS" })).toBe("1240,50");
    expect(amountToInputValue({ amountMinor: 124000, currency: "ARS" })).toBe("1240");
  });

  it("no inventa decimales en una moneda que no los tiene", () => {
    expect(amountToInputValue({ amountMinor: 1200, currency: "CLP" })).toBe("1200");
  });

  it("es la inversa de parseAmount", () => {
    for (const written of ["1240000", "1240,50", "0", "7"]) {
      expect(amountToInputValue(parseAmount(written, "ARS"))).toBe(written);
    }
  });
});
