import type {
  BudgetItem,
  ExpenseRecord,
  MilestoneRecord,
  PaymentMethod,
} from "@/src/domain/entities";
import { money } from "@/src/domain/money";

import type { DataLayer } from "../data-layer";
import { fakeLogger, fakeSupabaseLayer } from "../test-support/fake-data-layer";
import { capabilities } from "./registry";
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

export const SITE = "https://ejemplo.test";

/**
 * Valores que no existen en ninguna página pública. Si uno aparece en la salida
 * de una capacidad, hay una fuga: no hay forma de que haya llegado ahí por una
 * fuente publicada.
 */
export const SENTINELS = {
  contributorName: "Sentinela Privada",
  contributorEmail: "sentinela@ejemplo.test",
  receiptPath: "comprobantes/sentinela.pdf",
  voidReason: "Sentinela: se cargó dos veces el mismo remito",
} as const;

/** Los dos aportes que suman el total sembrado. Individualmente no son públicos. */
export const APORTES_INDIVIDUALES = [13_000_000, 11_000_000] as const;
export const TOTAL_RECIBIDO = 24_000_000;

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

export function sembrada(): DataLayer {
  return fakeSupabaseLayer({
    received: [money(TOTAL_RECIBIDO, "ARS")],
    expenses: [gastoConDatosInternos],
    milestones: hitos,
    budgetItems: rubros,
    paymentMethods: metodos,
  });
}

export function context(dataLayer: DataLayer = sembrada()): CapabilityContext {
  return { dataLayer, logger: fakeLogger(), siteUrl: SITE };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Falla con el motivo de la capacidad, que es más útil que un `ok` en falso. */
export function esperarOk(result: CapabilityResult<unknown>): {
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
export const CONTRATO: Record<string, readonly string[]> = {
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
export const CAPACIDADES_CON_BASE = [
  "get_campaign_status",
  "get_donation_methods",
  "get_reconstruction_progress",
  "get_transparency_summary",
] as const;

export const NOMBRES = capabilities.map((capability) => capability.name);
