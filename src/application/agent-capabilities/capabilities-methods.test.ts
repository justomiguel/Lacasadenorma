import { describe, expect, it } from "vitest";

import { fakeSupabaseLayer } from "../test-support/fake-data-layer";
import { runCapability } from "./registry";
import { TOTAL_RECIBIDO, context, esperarOk } from "./capabilities-test-helpers";

describe("get_donation_methods", () => {
  it("filtra por país cuando se lo piden, que es la entrada válida", async () => {
    const { output } = esperarOk(
      await runCapability("get_donation_methods", { country: "AR" }, context()),
    );

    expect(output.methods).toEqual([
      {
        country: "AR",
        currency: "ARS",
        label: "Cuenta en pesos",
        kind: "bank_transfer",
        fields: [
          { label: "CBU", value: "0000003100010000000001" },
          { label: "Titular", value: "Familia de Norma" },
        ],
        instructions: "La transferencia se hace desde el banco de quien aporta.",
      },
    ]);
  });

  it("rechaza un país que no existe en lugar de devolver la lista entera", async () => {
    const result = await runCapability(
      "get_donation_methods",
      { country: "XX" },
      context(),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.code).toBe("invalid_input");
    expect(result.message).toMatch(/pa[ií]s/i);
  });

  it("rechaza una clave desconocida en lugar de ignorarla", async () => {
    // `pais` en castellano es el error honesto más probable de quien llama. Si se
    // ignorara, la respuesta traería los tres países y quien preguntó creería que
    // filtró: el esquema dejaría de ser una frontera (amenaza A4).
    const result = await runCapability("get_donation_methods", { pais: "AR" }, context());

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.code).toBe("invalid_input");
  });

  it("sin cuentas publicadas devuelve lista vacía y lo dice: no inventa un CBU", async () => {
    const { output, text } = esperarOk(
      await runCapability(
        "get_donation_methods",
        {},
        context(fakeSupabaseLayer({ paymentMethods: [] })),
      ),
    );

    // Mostrar una cuenta sin verificar es el peor fallo posible del sitio (T1).
    expect(output).toEqual({ methods: [] });
    expect(text).toMatch(/todav[ií]a no/i);
  });
});

describe("get_campaign_status", () => {
  it("devuelve la composición de lo ya recibido, no montos", async () => {
    const { output, text } = esperarOk(
      await runCapability("get_campaign_status", {}, context()),
    );

    expect(output).toMatchObject({
      spentPercent: (10_000_000 / TOTAL_RECIBIDO) * 100,
      remainingPercent: (14_000_000 / TOTAL_RECIBIDO) * 100,
      reconciledAt: "2026-09-08T00:00:00.000Z",
    });
    expect(typeof output.updatedAt).toBe("string");
    expect(text).not.toMatch(/\$/);
    expect(JSON.stringify(output)).not.toContain(String(TOTAL_RECIBIDO));
  });
});

describe("get_reconstruction_progress", () => {
  it("mide el avance sobre hitos y deja sin monto el rubro que no está cotizado", async () => {
    const { output } = esperarOk(
      await runCapability("get_reconstruction_progress", {}, context()),
    );

    // El porcentaje se calcula sobre hitos y no sobre dinero: un 60% de la plata
    // no es un 60% de la casa, y presentarlos como una sola medida engaña.
    expect(output).toMatchObject({
      completedCount: 1,
      totalCount: 2,
      percentComplete: 50,
    });
    expect(output.budgetItems).toEqual([
      { title: "Materiales", percentOfQuoted: 100 },
      { title: "Mano de obra", percentOfQuoted: null },
    ]);
  });
});
