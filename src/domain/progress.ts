import type { MilestoneRecord } from "./entities";
import { sumMoney, type CurrencyCode, type Money } from "./money";
import { ratioAsPercentage } from "./percentage";

/**
 * Avance de la campaña. Hay dos medidas distintas y confundirlas sería engañoso:
 * el dinero recaudado contra el objetivo, y los hitos de obra completados. Un
 * 60% de plata no es un 60% de casa.
 *
 * Lo recaudado llega ya agregado por moneda, no como un detalle de aportes: no
 * existe un detalle público del que sumarlo (ADR-016).
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
  /** Total recibido por moneda, tal como lo devuelve `campaign_totals`. */
  readonly received: readonly Money[];
  readonly goal: Money | null;
  readonly onOutOfRange?: (value: number) => void;
}

export function summarizeFundraising(
  input: SummarizeFundraisingInput,
): FundraisingProgress {
  const currency: CurrencyCode =
    input.goal?.currency ?? input.received[0]?.currency ?? "ARS";

  const sumIn = (code: CurrencyCode): Money =>
    sumMoney(
      input.received.filter((amount) => amount.currency === code),
      code,
    );

  const raised = sumIn(currency);

  const otherCurrencies = [...new Set(input.received.map((amount) => amount.currency))]
    .filter((code) => code !== currency)
    .sort()
    .map(sumIn)
    // Una moneda con total cero no se muestra: la vista devuelve una fila por
    // cada moneda que aparece en aportes **o** en gastos, así que puede traer una
    // moneda en la que sólo se gastó.
    .filter((amount) => amount.amountMinor !== 0);

  return {
    raised,
    goal: input.goal,
    percent: ratioAsPercentage(
      raised.amountMinor,
      input.goal?.amountMinor ?? null,
      input.onOutOfRange,
    ),
    otherCurrencies,
    hasData: input.received.length > 0 || input.goal !== null,
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
