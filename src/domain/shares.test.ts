import { describe, expect, it } from "vitest";

import type { BudgetItem } from "./entities";
import { money } from "./money";
import { quotedBudgetShares } from "./shares";

function rubro(
  partial: Partial<BudgetItem> & Pick<BudgetItem, "id" | "title">,
): BudgetItem {
  return {
    description: null,
    estimatedAmount: null,
    sortOrder: 0,
    ...partial,
  };
}

describe("quotedBudgetShares", () => {
  it("reparte cada rubro cotizado sobre la suma de los cotizados, no sobre un 100% de obra", () => {
    const shares = quotedBudgetShares([
      rubro({ id: "techo", title: "Techo", estimatedAmount: money(75, "ARS") }),
      rubro({ id: "pintura", title: "Pintura" }),
      rubro({ id: "paredes", title: "Paredes", estimatedAmount: money(25, "ARS") }),
    ]);

    expect(shares).toEqual([
      { id: "techo", percentOfQuoted: 75 },
      { id: "pintura", percentOfQuoted: null },
      { id: "paredes", percentOfQuoted: 25 },
    ]);
  });

  it("sin ningún rubro cotizado no inventa porcentajes", () => {
    const shares = quotedBudgetShares([rubro({ id: "techo", title: "Techo" })]);

    expect(shares).toEqual([{ id: "techo", percentOfQuoted: null }]);
  });

  it("no mezcla monedas: un rubro en otra moneda queda sin porcentaje", () => {
    const shares = quotedBudgetShares([
      rubro({ id: "techo", title: "Techo", estimatedAmount: money(80, "ARS") }),
      rubro({ id: "flete", title: "Flete", estimatedAmount: money(20, "USD") }),
    ]);

    expect(shares).toEqual([
      { id: "techo", percentOfQuoted: 100 },
      { id: "flete", percentOfQuoted: null },
    ]);
  });
});
