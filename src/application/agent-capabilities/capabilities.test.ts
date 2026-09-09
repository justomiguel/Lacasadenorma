import { describe, expect, it } from "vitest";

import type {
  BudgetItem,
  ExpenseRecord,
  MilestoneRecord,
  PaymentMethod,
} from "@/src/domain/entities";
import { money } from "@/src/domain/money";

import type { DataLayer } from "../data-layer";
import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { CAPABILITY_LIMITS, capabilities, runCapability } from "./registry";
import type { CapabilityContext, CapabilityResult } from "./types";

/**
 * Las cinco capacidades, probadas por donde las llama un agente: `runCapability`.
 *
 * Dos preguntas ordenan el archivo, y son las dos del modelo de amenazas:
 *
 * 1. ¿Se filtra algo que no está publicado (A6)? Los datos sembrados llevan
 *    valores centinela reconocibles en los campos privados, y ningún centinela
 *    puede aparecer en ninguna salida.
 * 2. ¿Se presenta un cero como si fuera un dato (principio XII)? Sin base
 *    configurada, una capacidad tiene que decir que no sabe, no responder 0.
 *
 * Que los descriptores no declaren mutación se prueba en `registry.test.ts`.
 */

const SITE = "https://ejemplo.test";

/**
 * Valores que no existen en ninguna página pública. Si uno aparece en la salida
 * de una capacidad, hay una fuga: no hay forma de que haya llegado ahí por una
 * fuente publicada.
 */
const SENTINELS = {
  contributorName: "Sentinela Privada",
  contributorEmail: "sentinela@ejemplo.test",
  receiptPath: "comprobantes/sentinela.pdf",
  voidReason: "Sentinela: se cargó dos veces el mismo remito",
} as const;

/** Los dos aportes que suman el total sembrado. Individualmente no son públicos. */
const APORTES_INDIVIDUALES = [13_000_000, 11_000_000] as const;
const TOTAL_RECIBIDO = 24_000_000;

/**
 * Un gasto tal como podría llegar de la base: con las columnas internas que la
 * fila tiene de verdad. El mapeo público las descarta hoy, pero pasar de un
 * `select` de columnas a un `select("*")` es un cambio de una línea, y la
 * capacidad no tiene que dejarlas pasar ni en ese caso.
 */
interface ExpenseConColumnasInternas extends ExpenseRecord {
  readonly voidReason: string;
  readonly storagePath: string;
  readonly contributorName: string;
  readonly contributorEmail: string;
}

const gastoConDatosInternos: ExpenseConColumnasInternas = {
  id: "e1",
  amount: money(10_000_000, "ARS"),
  spentAt: "2026-09-02",
  concept: "Chapas para el techo",
  category: "materiales",
  supplier: "Corralón del pueblo",
  budgetItemId: null,
  receiptCount: 2,
  voidedAt: null,
  voidReason: SENTINELS.voidReason,
  storagePath: SENTINELS.receiptPath,
  contributorName: SENTINELS.contributorName,
  contributorEmail: SENTINELS.contributorEmail,
};

const hitos: MilestoneRecord[] = [
  {
    id: "m1",
    title: "Limpieza del terreno",
    description: null,
    status: "completado",
    happenedOn: "2026-08-20",
    sortOrder: 1,
  },
  {
    id: "m2",
    title: "Techo",
    description: null,
    status: "en_curso",
    happenedOn: null,
    sortOrder: 2,
  },
];

const rubros: BudgetItem[] = [
  {
    id: "b1",
    title: "Materiales",
    description: null,
    estimatedAmount: money(40_000_000, "ARS"),
    sortOrder: 1,
  },
  {
    id: "b2",
    title: "Mano de obra",
    description: null,
    estimatedAmount: null,
    sortOrder: 2,
  },
];

const metodos: PaymentMethod[] = [
  {
    id: "p1",
    kind: "bank_transfer",
    countryCode: "AR",
    currency: "ARS",
    label: "Cuenta en pesos",
    fields: [
      { label: "CBU", value: "0000003100010000000001", copyable: true, hint: null },
      { label: "Titular", value: "Familia de Norma", copyable: false, hint: null },
    ],
    instructions: "La transferencia se hace desde el banco de quien aporta.",
    sortOrder: 1,
  },
  {
    id: "p2",
    kind: "bank_transfer",
    countryCode: "CL",
    currency: "CLP",
    label: "Cuenta en Chile",
    fields: [{ label: "RUT", value: "11111111-1", copyable: true, hint: null }],
    instructions: null,
    sortOrder: 2,
  },
];

function sembrada(): DataLayer {
  return fakeSupabaseLayer({
    received: [money(TOTAL_RECIBIDO, "ARS")],
    expenses: [gastoConDatosInternos],
    milestones: hitos,
    budgetItems: rubros,
    paymentMethods: metodos,
  });
}

function context(dataLayer: DataLayer = sembrada()): CapabilityContext {
  return { dataLayer, logger: fakeLogger(), siteUrl: SITE };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Falla con el motivo de la capacidad, que es más útil que un `ok` en falso. */
function esperarOk(result: CapabilityResult<unknown>): {
  output: Record<string, unknown>;
  text: string;
} {
  if (!result.ok) {
    throw new Error(`La capacidad no devolvió datos: ${result.code} — ${result.message}`);
  }

  if (!isRecord(result.output)) {
    throw new Error("La salida de una capacidad tiene que ser un objeto del contrato.");
  }

  return { output: result.output, text: result.text };
}

/** La forma exacta de `contracts/agent-capabilities.md`, campo por campo. */
const CONTRATO: Record<string, readonly string[]> = {
  get_campaign_status: [
    "goalMinor",
    "raisedMinor",
    "percent",
    "currency",
    "reconciledAt",
    "updatedAt",
  ],
  get_donation_methods: ["methods"],
  get_reconstruction_progress: [
    "milestones",
    "completedCount",
    "totalCount",
    "percentComplete",
    "budgetItems",
  ],
  get_norma_story: [
    "name",
    "roleLabel",
    "place",
    "summary",
    "paragraphs",
    "bornOn",
    "diedOn",
  ],
  get_transparency_summary: [
    "receivedMinor",
    "spentMinor",
    "balanceMinor",
    "currency",
    "executedPercent",
    "expenseCount",
    "receiptCount",
    "byCategory",
    "reconciledAt",
    "detailUrl",
  ],
};

/** Las cuatro que leen de la base. `get_norma_story` no está: lee del repositorio. */
const CAPACIDADES_CON_BASE = [
  "get_campaign_status",
  "get_donation_methods",
  "get_reconstruction_progress",
  "get_transparency_summary",
] as const;

const NOMBRES = capabilities.map((capability) => capability.name);

describe("las cinco capacidades", () => {
  it("el contrato del test cubre exactamente las capacidades registradas", () => {
    // Sin esto, agregar una capacidad sexta pasaría por acá sin que nada la
    // revise: los `it.each` de abajo recorren el registro, no una lista fija.
    expect(NOMBRES.toSorted()).toEqual(Object.keys(CONTRATO).toSorted());
  });

  it.each(NOMBRES)("%s devuelve la forma exacta del contrato", async (name) => {
    const { output } = esperarOk(await runCapability(name, {}, context()));

    // Un campo de más es tan grave como uno de menos: es un dato que el contrato
    // no revisó y que nadie sabe de dónde salió.
    expect(Object.keys(output).toSorted()).toEqual(
      [...(CONTRATO[name] ?? [])].toSorted(),
    );
  });

  it.each(NOMBRES)(
    "%s devuelve texto y entra en el presupuesto de Chrome",
    async (name) => {
      const { text } = esperarOk(await runCapability(name, {}, context()));

      // El texto es lo que lee un agente que no procesa el JSON: vacío equivale a
      // no haber respondido. Pasado de largo, Chrome lo corta por la mitad.
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(CAPABILITY_LIMITS.output);
    },
  );

  it.each(NOMBRES)("%s respeta los límites de nombre y descripción", (name) => {
    const capability = capabilities.find((item) => item.name === name);

    expect(capability?.name.length).toBeLessThanOrEqual(CAPABILITY_LIMITS.name);
    expect(capability?.description.length).toBeLessThanOrEqual(
      CAPABILITY_LIMITS.description,
    );
  });
});

describe("ninguna capacidad filtra datos privados (A6)", () => {
  it.each(NOMBRES)("%s no deja pasar ningún centinela privado", async (name) => {
    const { output, text } = esperarOk(await runCapability(name, {}, context()));
    const serializado = `${JSON.stringify(output)} ${text}`;

    for (const centinela of Object.values(SENTINELS)) {
      expect(serializado).not.toContain(centinela);
    }
  });

  it.each(NOMBRES)(
    "%s no expone nombres, correos ni rutas de comprobante",
    async (name) => {
      const { output, text } = esperarOk(await runCapability(name, {}, context()));
      const serializado = `${JSON.stringify(output)} ${text}`;

      // Publicar que el comprobante existe es la promesa (FR-013); publicar dónde
      // está el archivo es la fuga que esa promesa tiene que evitar.
      expect(serializado).not.toContain("storagePath");
      expect(serializado).not.toContain("storage_path");
      expect(serializado).not.toContain("comprobantes/");
      expect(serializado).not.toContain(".pdf");
      expect(serializado).not.toContain("voidReason");
      expect(serializado).not.toContain("void_reason");
      expect(serializado).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    },
  );

  it.each(NOMBRES)("%s no expone montos de aportes individuales", async (name) => {
    const { output, text } = esperarOk(await runCapability(name, {}, context()));
    const serializado = `${JSON.stringify(output)} ${text}`;

    // La capa pública sólo ve totales por moneda (ADR-016). Estos dos montos
    // suman el total sembrado: si alguno se pudiera leer en la salida, el camino
    // del agente estaría viendo aportes uno por uno, que nunca son públicos.
    for (const aporte of APORTES_INDIVIDUALES) {
      expect(serializado).not.toContain(String(aporte));
    }
  });

  it("el resumen de la rendición publica cantidades, no archivos ni identidades", async () => {
    const { output } = esperarOk(
      await runCapability("get_transparency_summary", {}, context()),
    );

    expect(output).toMatchObject({
      receivedMinor: TOTAL_RECIBIDO,
      spentMinor: 10_000_000,
      balanceMinor: 14_000_000,
      expenseCount: 1,
      receiptCount: 2,
      detailUrl: `${SITE}/transparencia`,
    });
    // El proveedor sí es público en el detalle de la página, pero el resumen
    // agregado no lo incluye: cada capacidad devuelve su forma y nada más.
    expect(JSON.stringify(output)).not.toContain("Corralón");
  });
});

describe("sin base configurada", () => {
  it.each(CAPACIDADES_CON_BASE)(
    "%s dice que no está disponible, no devuelve cero",
    async (name) => {
      const result = await runCapability(name, {}, context(contentOnlyLayer));

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.code).toBe("unavailable");
      // Un cero devuelto como dato real es una mentira que quien consume no puede
      // detectar. Que no haya `output` es justamente lo que lo impide.
      expect(result).not.toHaveProperty("output");
      expect(result).not.toHaveProperty("text");
    },
  );

  it.each(CAPACIDADES_CON_BASE)("%s explica en castellano qué pasó", async (name) => {
    const result = await runCapability(name, {}, context(contentOnlyLayer));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    // El mensaje lo lee un modelo que se lo va a repetir a una persona: tiene que
    // ser prosa en castellano, no un código ni un volcado técnico (amenaza I6).
    expect(result.message).toMatch(/cifras|campaña|página/i);
    expect(result.message.length).toBeGreaterThan(20);
    expect(result.message).not.toMatch(/error:|undefined|null|Exception/);
  });

  it("get_norma_story sigue respondiendo: el contenido editorial está en el repositorio", async () => {
    // Es lo que permite clonar el repositorio y ver el sitio completo sin
    // credenciales (SC-012). Si esta capacidad dependiera de la base, la
    // historia de Norma desaparecería en un despliegue sin configurar.
    const { output, text } = esperarOk(
      await runCapability("get_norma_story", {}, context(contentOnlyLayer)),
    );

    expect(output).toMatchObject({ bornOn: null, diedOn: null });
    expect(Array.isArray(output.paragraphs) && output.paragraphs.length).toBeGreaterThan(
      0,
    );
    expect(text.length).toBeGreaterThan(0);
  });
});

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
  it("devuelve el total conciliado y el porcentaje sobre el objetivo", async () => {
    const { output } = esperarOk(
      await runCapability("get_campaign_status", {}, context()),
    );

    expect(output).toMatchObject({
      goalMinor: 100_000_000,
      raisedMinor: TOTAL_RECIBIDO,
      percent: 24,
      currency: "ARS",
      reconciledAt: "2026-09-08T00:00:00.000Z",
    });
    expect(typeof output.updatedAt).toBe("string");
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
      { title: "Materiales", estimatedMinor: 40_000_000, currency: "ARS" },
      { title: "Mano de obra", estimatedMinor: null, currency: null },
    ]);
  });
});
