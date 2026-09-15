import { describe, expect, it } from "vitest";

import type { DonationItem } from "@/src/domain/entities";

import { fakeSupabaseLayer } from "../test-support/fake-data-layer";
import { runCapability } from "./registry";
import { SENTINELS, context, esperarOk } from "./capabilities-test-helpers";

const VALOR_ESTIMADO_INTERNO = 87_654_321;

const item: DonationItem = {
  id: "item-catalogo-1",
  campaignId: "11111111-1111-4111-8111-111111111111",
  budgetItemId: null,
  title: "Chapas del techo",
  description: "Chapa sinusoidal calibre 25, de 3,66 m",
  unit: "unidad",
  category: "materiales",
  neededQuantity: 40,
  remainingQuantity: 35,
  fulfilledQuantity: 5,
  estimatedValue: null,
  photo: null,
  sortOrder: 1,
};

describe("get_donation_catalog", () => {
  it("devuelve título, unidad y cantidades, y no el valor estimado ni nombres", async () => {
    const { output, text } = esperarOk(
      await runCapability(
        "get_donation_catalog",
        {},
        context(
          fakeSupabaseLayer({
            catalog: [item],
            wall: [
              {
                id: "wall-secreto",
                itemId: item.id,
                itemTitle: item.title,
                quantity: 5,
                donorDisplayName: SENTINELS.contributorName,
                fulfilledAt: "2026-09-10T00:00:00.000Z",
              },
            ],
          }),
        ),
      ),
    );

    expect(output).toMatchObject({
      items: [
        {
          title: "Chapas del techo",
          description: "Chapa sinusoidal calibre 25, de 3,66 m",
          unit: "unidad",
          category: "materiales",
          needed: 40,
          remaining: 35,
          estimated: null,
        },
      ],
    });
    expect(text).toMatch(/faltan 35 de 40/i);

    const serializado = `${JSON.stringify(output)} ${text}`;

    expect(serializado).not.toContain(SENTINELS.contributorName);
    expect(serializado).not.toContain(SENTINELS.contributorEmail);
    expect(serializado).not.toContain(item.id);
    expect(serializado).not.toContain("estimatedValue");
    expect(serializado).not.toContain("estimated_unit");
    expect(serializado).not.toContain(String(VALOR_ESTIMADO_INTERNO));
    expect(serializado).not.toContain("user_id");
    expect(serializado).not.toContain("donor_note");
  });

  it("si la ficha tiene estimado, el agente cita el mismo número etiquetado", async () => {
    const conEstimado = {
      ...item,
      estimatedValue: { amountMinor: 15_000_000, currency: "ARS" as const },
    };
    const { output, text } = esperarOk(
      await runCapability(
        "get_donation_catalog",
        {},
        context(fakeSupabaseLayer({ catalog: [conEstimado] })),
      ),
    );

    expect(output).toMatchObject({
      items: [
        {
          estimated: { amountMinor: 15_000_000, currency: "ARS" },
        },
      ],
    });
    expect(text).toMatch(/estimado, no fijo/i);
    expect(text).toMatch(/150\.000/);
  });

  it("sin ítems publicados devuelve lista vacía y lo dice: no inventa un catálogo", async () => {
    const { output, text } = esperarOk(
      await runCapability(
        "get_donation_catalog",
        {},
        context(fakeSupabaseLayer({ catalog: [] })),
      ),
    );

    expect(output).toMatchObject({ items: [] });
    expect(text).toMatch(/todav[ií]a no/i);
  });
});
