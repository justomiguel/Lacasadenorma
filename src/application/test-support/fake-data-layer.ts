import type {
  BudgetItem,
  Campaign,
  ContributionRecord,
  ExpenseRecord,
  MilestoneRecord,
  PaymentMethod,
  UpdateRecord,
} from "@/src/domain/entities";
import { money } from "@/src/domain/money";
import type { Logger } from "@/src/domain/ports/logger";

import type { DataLayer } from "../data-layer";

/**
 * Repositorios en memoria para probar la capa de aplicación sin base de datos.
 *
 * Existen porque los casos de uso dependen de puertos, no de Supabase (ADR-005).
 * Si estos fakes fueran difíciles de escribir, sería la señal de que la frontera
 * está mal puesta.
 */

export interface FakeData {
  campaign?: Campaign | null;
  budgetItems?: BudgetItem[];
  contributions?: ContributionRecord[];
  expenses?: ExpenseRecord[];
  milestones?: MilestoneRecord[];
  paymentMethods?: PaymentMethod[];
  updates?: UpdateRecord[];
  /** Cuando está definido, todas las lecturas fallan con este error. */
  failWith?: Error;
}

export const fakeCampaign: Campaign = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "casa-de-norma",
  title: "La Casa de Norma",
  summary: "Reconstrucción de la casa de la familia.",
  goal: money(100_000_000, "ARS"),
  goalCurrency: "ARS",
  status: "active",
  reconciledAt: "2026-09-08T00:00:00.000Z",
};

export function fakeLogger(): Logger & { calls: string[] } {
  const calls: string[] = [];

  return {
    calls,
    debug: (message) => calls.push(`debug:${message}`),
    info: (message) => calls.push(`info:${message}`),
    warn: (message) => calls.push(`warn:${message}`),
    error: (message) => calls.push(`error:${message}`),
  };
}

export function fakeSupabaseLayer(data: FakeData = {}): DataLayer {
  function guard<T>(value: T): Promise<T> {
    if (data.failWith !== undefined) {
      return Promise.reject(data.failWith);
    }

    return Promise.resolve(value);
  }

  return {
    source: "supabase",
    campaigns: {
      getActiveCampaign: () =>
        guard(data.campaign === undefined ? fakeCampaign : data.campaign),
      listBudgetItems: () => guard(data.budgetItems ?? []),
    },
    transparency: {
      listContributions: () => guard(data.contributions ?? []),
      listPublishedExpenses: () => guard(data.expenses ?? []),
    },
    milestones: {
      listPublishedMilestones: () => guard(data.milestones ?? []),
    },
    paymentMethods: {
      listPublishedMethods: () => guard(data.paymentMethods ?? []),
    },
    updates: {
      listPublishedUpdates: () => guard(data.updates ?? []),
      findPublishedUpdateBySlug: (slug) =>
        guard(data.updates?.find((item) => item.slug === slug) ?? null),
    },
  };
}

export const contentOnlyLayer: DataLayer = { source: "content-only" };
