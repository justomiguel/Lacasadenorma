import { describe, expect, it } from "vitest";

import { safeAccountReturn } from "./return-path";

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
