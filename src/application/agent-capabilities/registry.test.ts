import { describe, expect, it } from "vitest";

import { money } from "@/src/domain/money";

import type { DataLayer } from "../data-layer";
import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import {
  CAPABILITY_LIMITS,
  capabilities,
  findCapability,
  runCapability,
} from "./registry";
import type { CapabilityContext } from "./types";

function context(dataLayer: DataLayer = fakeSupabaseLayer()): CapabilityContext {
  return { dataLayer, logger: fakeLogger(), siteUrl: "https://ejemplo.test" };
}

describe("registro de capacidades", () => {
  it("expone exactamente las cinco capacidades del contrato", () => {
    expect(capabilities.map((capability) => capability.name)).toEqual([
      "get_campaign_status",
      "get_donation_methods",
      "get_reconstruction_progress",
      "get_norma_story",
      "get_transparency_summary",
    ]);
  });

  it("ninguna capacidad declara mutación (amenaza A1)", () => {
    for (const capability of capabilities) {
      expect(capability.readOnly).toBe(true);
    }
  });

  it("los nombres respetan el formato y el presupuesto de Chrome", () => {
    for (const capability of capabilities) {
      expect(capability.name).toMatch(/^[a-z0-9_]+$/);
      expect(capability.name.length).toBeLessThanOrEqual(CAPABILITY_LIMITS.name);
    }
  });

  it("las descripciones son literales, afirmativas y no dan instrucciones al modelo (A3)", () => {
    for (const capability of capabilities) {
      expect(capability.description.length).toBeLessThanOrEqual(
        CAPABILITY_LIMITS.description,
      );
      // Una descripción que le habla al modelo es el vector de tool poisoning.
      expect(capability.description).not.toMatch(
        /\b(siempre|nunca|deb[eé]s|ignor[aá]|instrucci[oó]n|prioriz[aá]|system prompt)\b/i,
      );
      // Nada interpolado: una descripción tiene que ser una constante.
      expect(capability.description).not.toMatch(/\$\{|\{\{/);
    }
  });

  it("encuentra una capacidad por nombre y no inventa una que no existe", () => {
    expect(findCapability("get_campaign_status")?.name).toBe("get_campaign_status");
    expect(findCapability("transfer_money")).toBeUndefined();
  });
});

describe("runCapability", () => {
  it("rechaza una entrada inválida en el servidor, aunque el esquema ya la declare (A4)", async () => {
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

  it("rechaza campos desconocidos en lugar de ignorarlos", async () => {
    const result = await runCapability(
      "get_campaign_status",
      { includePrivateData: true },
      context(),
    );

    expect(result.ok).toBe(false);
  });

  it("devuelve un error nombrado cuando la capacidad no existe", async () => {
    const result = await runCapability("delete_everything", {}, context());

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.code).toBe("not_found");
  });

  it("sin base configurada explica en prosa que la cifra no está disponible", async () => {
    const result = await runCapability(
      "get_campaign_status",
      {},
      context(contentOnlyLayer),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.code).toBe("unavailable");
    expect(result.message.length).toBeGreaterThan(20);
  });

  it("el texto para agentes no supera el presupuesto de salida", async () => {
    for (const capability of capabilities) {
      const result = await runCapability(capability.name, {}, context());

      if (result.ok) {
        expect(result.text.length).toBeLessThanOrEqual(CAPABILITY_LIMITS.output);
      }
    }
  });
});

describe("get_campaign_status", () => {
  it("devuelve objetivo, recaudado, porcentaje, moneda y fecha de conciliación", async () => {
    const result = await runCapability(
      "get_campaign_status",
      {},
      context(
        fakeSupabaseLayer({
          received: [money(25_000_000, "ARS")],
        }),
      ),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).toEqual({
      goalMinor: 100_000_000,
      raisedMinor: 25_000_000,
      percent: 25,
      currency: "ARS",
      reconciledAt: "2026-09-08T00:00:00.000Z",
      updatedAt: expect.any(String),
    });
  });

  it("sin objetivo cargado el porcentaje es nulo y el texto lo dice", async () => {
    const result = await runCapability(
      "get_campaign_status",
      {},
      context(fakeSupabaseLayer({ campaign: { ...fakeCampaignWithoutGoal() } })),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).toMatchObject({ goalMinor: null, percent: null });
    expect(result.text).toMatch(/objetivo todav[ií]a no est[aá] publicado/i);
  });
});

describe("get_donation_methods", () => {
  it("sin métodos publicados devuelve lista vacía y lo dice: no inventa datos bancarios", async () => {
    const result = await runCapability(
      "get_donation_methods",
      {},
      context(fakeSupabaseLayer({ paymentMethods: [] })),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).toEqual({ methods: [] });
    expect(result.text).toMatch(/todav[ií]a no/i);
  });
});

describe("get_norma_story", () => {
  it("no estima las fechas que la familia no publicó", async () => {
    const result = await runCapability("get_norma_story", {}, context());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).toMatchObject({ bornOn: "1955-01-19", diedOn: null });
  });
});

describe("get_transparency_summary", () => {
  it("no devuelve rutas de comprobantes ni aportes individuales (A6)", async () => {
    const result = await runCapability(
      "get_transparency_summary",
      {},
      context(
        fakeSupabaseLayer({
          received: [money(25_000_000, "ARS")],
          expenses: [
            {
              id: "e1",
              amount: money(10_000_000, "ARS"),
              spentAt: "2026-09-02",
              concept: "Chapas",
              category: "materiales",
              supplier: "Corralón del pueblo",
              budgetItemId: null,
              receiptCount: 2,
              voidedAt: null,
            },
          ],
        }),
      ),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialized = JSON.stringify(result.output);

    expect(serialized).not.toContain("storage_path");
    expect(serialized).not.toContain("storagePath");
    expect(serialized).not.toContain("c1");
    expect(result.output).toMatchObject({
      receivedMinor: 25_000_000,
      spentMinor: 10_000_000,
      balanceMinor: 15_000_000,
      expenseCount: 1,
      receiptCount: 2,
    });
  });

  it("incluye el enlace a la página pública para que el agente pueda citarla", async () => {
    const result = await runCapability("get_transparency_summary", {}, context());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.output).toMatchObject({
      detailUrl: "https://ejemplo.test/transparencia",
    });
  });
});

function fakeCampaignWithoutGoal() {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "casa-de-norma",
    title: "La Casa de Norma",
    summary: "Reconstrucción de la casa de la familia.",
    goal: null,
    goalCurrency: "ARS" as const,
    status: "active" as const,
    reconciledAt: null,
  };
}
