import { describe, expect, it } from "vitest";

import { accountHref, safeAccountReturn } from "./return-path";

describe("safeAccountReturn", () => {
  it("sin destino vuelve a la cuenta", () => {
    expect(safeAccountReturn(undefined, "es")).toBe("/cuenta");
    expect(safeAccountReturn("", "en")).toBe("/en/cuenta");
  });

  it("acepta el catálogo, con ítem o sin él", () => {
    expect(safeAccountReturn("/catalogo", "es")).toBe("/catalogo");
    expect(
      safeAccountReturn("/catalogo?item=ab700000-0000-4000-8000-000000000003", "es"),
    ).toBe("/catalogo/ab700000-0000-4000-8000-000000000003");
    expect(
      safeAccountReturn("/en/catalogo?item=AB700000-0000-4000-8000-000000000003", "en"),
    ).toBe("/en/catalogo/ab700000-0000-4000-8000-000000000003");
    expect(
      safeAccountReturn("/catalogo/ab700000-0000-4000-8000-000000000003", "es"),
    ).toBe("/catalogo/ab700000-0000-4000-8000-000000000003");
    expect(
      safeAccountReturn("/en/catalogo/AB700000-0000-4000-8000-000000000003", "en"),
    ).toBe("/en/catalogo/ab700000-0000-4000-8000-000000000003");
  });

  it("rechaza un origen, una ruta ajena y una query que no es el ítem", () => {
    expect(safeAccountReturn("https://otro.example/catalogo", "es")).toBe("/cuenta");
    expect(safeAccountReturn("//otro.example", "es")).toBe("/cuenta");
    expect(safeAccountReturn("/admin", "es")).toBe("/cuenta");
    expect(safeAccountReturn("/catalogo?item=no-es-uuid", "es")).toBe("/catalogo");
    expect(
      safeAccountReturn("/catalogo?item=ab700000-0000-4000-8000-000000000003&x=1", "es"),
    ).toBe("/catalogo");
  });
});

describe("accountHref", () => {
  it("sin vuelta es la pantalla pedida", () => {
    expect(accountHref("crear", "es")).toBe("/cuenta/crear");
    expect(accountHref("ingresar", "en")).toBe("/en/cuenta/ingresar");
  });

  it("lleva la ficha en volver, ya filtrada", () => {
    expect(
      accountHref("crear", "es", "/catalogo/ab700000-0000-4000-8000-000000000003"),
    ).toBe("/cuenta/crear?volver=%2Fcatalogo%2Fab700000-0000-4000-8000-000000000003");
    expect(
      accountHref("ingresar", "en", "/en/catalogo/AB700000-0000-4000-8000-000000000003"),
    ).toBe(
      "/en/cuenta/ingresar?volver=%2Fen%2Fcatalogo%2Fab700000-0000-4000-8000-000000000003",
    );
  });

  it("un destino ajeno no se agrega", () => {
    expect(accountHref("crear", "es", "https://otro.example")).toBe("/cuenta/crear");
  });
});
