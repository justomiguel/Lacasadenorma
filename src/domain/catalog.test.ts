import { describe, expect, it } from "vitest";

import {
  remaining,
  isCovered,
  canClaim,
  takenStatus,
  estimatedValueOf,
  isDonationUnit,
  isDonationItemCategory,
  groupCatalogByCategory,
  catalogItemPhotograph,
} from "./catalog";
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
    expect(() => remaining({ needed: 10, reserved: 0, fulfilled: -1 })).toThrow(
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

describe("canClaim", () => {
  it("no ofrece reservar un ítem cubierto", () => {
    expect(canClaim({ needed: 10, reserved: 4, fulfilled: 6 })).toBe(false);
    expect(canClaim({ needed: 10, reserved: 3, fulfilled: 6 })).toBe(true);
  });
});

describe("takenStatus", () => {
  const item = {
    id: "item-1",
    neededQuantity: 5,
    remainingQuantity: 5,
  };

  it("libre: nadie tomó y no hay nombres", () => {
    expect(takenStatus(item, [])).toEqual({ taken: false, names: [] });
  });

  it("tomada sin nombre: las cantidades dicen que falta menos, y lo anónimo no se nombra", () => {
    expect(takenStatus({ ...item, remainingQuantity: 3 }, [])).toEqual({
      taken: true,
      names: [],
    });
  });

  it("tomada con nombre: lista una vez cada quien eligió aparecer", () => {
    expect(
      takenStatus({ ...item, remainingQuantity: 2 }, [
        {
          id: "a",
          itemId: "item-1",
          quantity: 2,
          donorDisplayName: "María",
          fulfilledAt: null,
        },
        {
          id: "b",
          itemId: "item-1",
          quantity: 1,
          donorDisplayName: "María",
          fulfilledAt: "2026-09-14T00:00:00.000Z",
        },
        {
          id: "c",
          itemId: "item-2",
          quantity: 1,
          donorDisplayName: "Ajeno",
          fulfilledAt: null,
        },
      ]),
    ).toEqual({ taken: true, names: ["María"] });
  });

  it("si volvió a estar libre, no publica nombres viejos", () => {
    expect(
      takenStatus(item, [
        {
          id: "a",
          itemId: "item-1",
          quantity: 1,
          donorDisplayName: "María",
          fulfilledAt: null,
        },
      ]),
    ).toEqual({ taken: false, names: [] });
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

  it("una moneda que el sitio no usa no es un monto", () => {
    expect(() => estimatedValueOf(1_000, "XXX")).toThrow(DomainError);
  });
});

describe("isDonationUnit", () => {
  it("acepta las unidades del catálogo y rechaza el resto", () => {
    expect(isDonationUnit("unidad")).toBe(true);
    expect(isDonationUnit("metro_cuadrado")).toBe(true);
    expect(isDonationUnit("metro_cubico")).toBe(true);
    expect(isDonationUnit("kilo")).toBe(false);
  });
});

describe("isDonationItemCategory", () => {
  it("acepta el enum cerrado y rechaza una categoría libre", () => {
    expect(isDonationItemCategory("materiales")).toBe(true);
    expect(isDonationItemCategory("electrodomesticos")).toBe(true);
    expect(isDonationItemCategory("otros")).toBe(false);
  });
});

describe("groupCatalogByCategory", () => {
  it("agrupa en el orden de la obra y omite las categorías vacías", () => {
    const groups = groupCatalogByCategory([
      { category: "ajuar", sortOrder: 2, title: "Toallas" },
      { category: "materiales", sortOrder: 20, title: "Arena" },
      { category: "materiales", sortOrder: 10, title: "Ladrillos" },
      { category: "electrodomesticos", sortOrder: 1, title: "Heladera" },
    ]);

    expect(groups.map((group) => group.category)).toEqual([
      "materiales",
      "electrodomesticos",
      "ajuar",
    ]);
    expect(groups[0]?.items.map((item) => item.title)).toEqual(["Ladrillos", "Arena"]);
  });
});

describe("catalogItemPhotograph", () => {
  const uploaded = { url: "/storage/real.jpg" };
  const reference = { url: "/fotos/catalogo/ladrillos.jpg" };

  it("la foto subida pisa la de referencia (ADR-042)", () => {
    expect(catalogItemPhotograph(uploaded, reference)).toBe(uploaded);
  });

  it("sin foto subida usa la de referencia del tipo", () => {
    expect(catalogItemPhotograph(null, reference)).toBe(reference);
  });

  it("sin ninguna de las dos no inventa una", () => {
    expect(catalogItemPhotograph(null, null)).toBeNull();
  });
});
