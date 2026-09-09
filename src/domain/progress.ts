import type { ContributionRecord, MilestoneRecord } from "./entities";
import { sumMoney, type Money } from "./money";
import { ratioAsPercentage } from "./percentage";

/**
 * Avance de la campaña. Hay dos medidas distintas y confundirlas sería engañoso:
 * el dinero recaudado contra el objetivo, y los hitos de obra completados. Un
 * 60% de plata no es un 60% de casa.
 */

export interface FundraisingProgress {
  readonly raised: Money;
  readonly goal: Money | null;
  /** Nulo cuando no hay objetivo cargado. Nunca cero por falta de dato. */
  readonly percent: number | null;
  /** Aportes en monedas distintas a la del objetivo. No se convierten. */
  readonly otherCurrencies: readonly Money[];
  readonly hasData: boolean;
}

export interface SummarizeFundraisingInput {
  readonly contributions: readonly ContributionRecord[];
  readonly goal: Money | null;
  readonly onOutOfRange?: (value: number) => void;
}

export function summarizeFundraising(input: SummarizeFundraisingInput): FundraisingProgress {
  const live = input.contributions.filter((item) => item.voidedAt === null);
  const currency = input.goal?.currency ?? live[0]?.amount.currency ?? "ARS";

  const raised = sumMoney(
    live.filter((item) => item.amount.currency === currency).map((item) => item.amount),
    currency,
  );

  const otherCurrencies = [...new Set(live.map((item) => item.amount.currency))]
    .filter((code) => code !== currency)
    .sort()
    .map((code) =>
      sumMoney(
        live.filter((item) => item.amount.currency === code).map((item) => item.amount),
        code,
      ),
    );

  return {
    raised,
    goal: input.goal,
    percent: ratioAsPercentage(
      raised.amountMinor,
      input.goal?.amountMinor ?? null,
      input.onOutOfRange,
    ),
    otherCurrencies,
    hasData: live.length > 0 || input.goal !== null,
  };
}

export interface MilestoneProgress {
  readonly milestones: readonly MilestoneRecord[];
  readonly completedCount: number;
  readonly totalCount: number;
  /** Nulo cuando no hay hitos cargados: no hay avance que medir. */
  readonly percentComplete: number | null;
}

export function summarizeMilestones(
  milestones: readonly MilestoneRecord[],
): MilestoneProgress {
  const ordered = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = ordered.filter((item) => item.status === "completado").length;

  return {
    milestones: ordered,
    completedCount,
    totalCount: ordered.length,
    percentComplete: ratioAsPercentage(completedCount, ordered.length || null),
  };
}
