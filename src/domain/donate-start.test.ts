import { describe, expect, it } from "vitest";

import { parseDonateStart } from "./donate-start";

describe("parseDonateStart", () => {
  it("con mail abre el camino de la cuenta, aunque también haya teléfono", () => {
    expect(
      parseDonateStart({
        name: "  Ana  ",
        email: " ana@ejemplo.invalid ",
        phone: "11 1234-5678",
      }),
    ).toEqual({
      status: "ok",
      value: { channel: "email", name: "Ana", email: "ana@ejemplo.invalid" },
    });
  });

  it("sin mail y con teléfono abre el camino que reserva", () => {
    expect(
      parseDonateStart({
        name: "Ana",
        email: "  ",
        phone: "+54 9 11 1234 5678",
      }),
    ).toEqual({
      status: "ok",
      value: { channel: "phone", name: "Ana", phone: "+54 9 11 1234 5678" },
    });
  });

  it("sin nombre no sigue", () => {
    expect(parseDonateStart({ name: "   ", email: "ana@ejemplo.invalid" })).toEqual({
      status: "error",
      field: "contactName",
    });
  });

  it("sin teléfono ni mail pide uno de los dos", () => {
    expect(parseDonateStart({ name: "Ana", email: "", phone: "" })).toEqual({
      status: "error",
      field: "contactChannel",
    });
  });

  it("un mail que no parece mail se rechaza antes de abrir la cuenta", () => {
    expect(parseDonateStart({ name: "Ana", email: "ana-sin-arroba" })).toEqual({
      status: "error",
      field: "email",
    });
  });

  it("un teléfono sin dígitos de más no alcanza para avisar", () => {
    expect(parseDonateStart({ name: "Ana", phone: "123" })).toEqual({
      status: "error",
      field: "contactPhone",
    });
  });
});
