import type { ContributionRecord, ExpenseCategory, ExpenseRecord } from "./entities";
import { EXPENSE_CATEGORIES } from "./entities";
import { subtractMoney, sumMoney, type CurrencyCode, type Money } from "./money";
import { ratioAsPercentage } from "./percentage";

/**
 * Agregación de la rendición de cuentas.
 *
 * Tres reglas la gobiernan, y las tres vienen de la spec:
 *
 * 1. Los anulados no participan de ningún total (`voidedAt`).
 * 2. No se mezclan monedas. La moneda principal es la del objetivo; el resto se
 *    informa por separado, sin convertir, porque no hay tipo de cambio fechado.
 * 3. La suma del detalle publicado es exactamente el total publicado (SC-007).
 *    Por eso el detalle que se devuelve es el mismo array que se sumó, no una
 *    consulta distinta: dos consultas pueden divergir, un array no.
 */

/** Un dato conciliado hace más de este tiempo se marca como desactualizado (FR-010). */
const STALE_RECONCILIATION_DAYS = 30;

export interface CurrencyTotals {
  readonly currency: CurrencyCode;
  readonly received: Money;
  readonly spent: Money;
  readonly balance: Money;
  readonly executedPercent: number | null;
}

export interface CategoryTotal {
  readonly category: ExpenseCategory;
  readonly amount: Money;
}

export interface TransparencySummary {
  readonly primary: CurrencyTotals;
  /** Monedas presentes que no son la principal. Se muestran aparte, sin convertir. */
  readonly others: readonly CurrencyTotals[];
  /** El detalle que sustenta los totales, del más reciente al más antiguo. */
  readonly expenses: readonly ExpenseRecord[];
  readonly expenseCount: number;
  readonly receiptCount: number;
  readonly byCategory: readonly CategoryTotal[];
  readonly reconciledAt: string | null;
  readonly reconciliationIsStale: boolean;
  readonly isEmpty: boolean;
}

export interface SummarizeTransparencyInput {
  readonly contributions: readonly ContributionRecord[];
  readonly expenses: readonly ExpenseRecord[];
  readonly goal: Money | null;
  readonly reconciledAt: string | null;
  /** Inyectable para que el cálculo de antigüedad sea testeable sin esperar. */
  readonly now?: Date;
  readonly defaultCurrency?: CurrencyCode;
  readonly onOutOfRange?: (value: number) => void;
}

function isLive<T extends { voidedAt: string | null }>(record: T): boolean {
  return record.voidedAt === null;
}

function totalsFor(
  currency: CurrencyCode,
  contributions: readonly ContributionRecord[],
  expenses: readonly ExpenseRecord[],
  goal: Money | null,
  onOutOfRange?: (value: number) => void,
): CurrencyTotals {
  const received = sumMoney(
    contributions.filter((item) => item.amount.currency === currency).map((item) => item.amount),
    currency,
  );
  const spent = sumMoney(
    expenses.filter((item) => item.amount.currency === currency).map((item) => item.amount),
    currency,
  );

  // El porcentaje ejecutado sólo tiene sentido contra un objetivo en la misma
  // moneda. Si el objetivo está en otra, o no existe, se omite.
  const comparableGoal = goal !== null && goal.currency === currency ? goal : null;

  return {
    currency,
    received,
    spent,
    balance: subtractMoney(received, spent),
    executedPercent: ratioAsPercentage(
      spent.amountMinor,
      comparableGoal?.amountMinor ?? null,
      onOutOfRange,
    ),
  };
}

export function summarizeTransparency(input: SummarizeTransparencyInput): TransparencySummary {
  const contributions = input.contributions.filter(isLive);
  const expenses = input.expenses.filter(isLive);

  const primaryCurrency: CurrencyCode =
    input.goal?.currency ?? input.defaultCurrency ?? expenses[0]?.amount.currency ?? "ARS";

  const presentCurrencies = new Set<CurrencyCode>([
    ...contributions.map((item) => item.amount.currency),
    ...expenses.map((item) => item.amount.currency),
  ]);
  presentCurrencies.delete(primaryCurrency);

  const sortedExpenses = [...expenses].sort((a, b) => b.spentAt.localeCompare(a.spentAt));

  const byCategory = EXPENSE_CATEGORIES.map((category) => {
    const amounts = expenses
      .filter(
        (item) => item.category === category && item.amount.currency === primaryCurrency,
      )
      .map((item) => item.amount);

    return { category, amount: sumMoney(amounts, primaryCurrency) };
  }).filter((entry) => entry.amount.amountMinor !== 0);

  return {
    primary: totalsFor(
      primaryCurrency,
      contributions,
      expenses,
      input.goal,
      input.onOutOfRange,
    ),
    others: [...presentCurrencies]
      .sort()
      .map((currency) => totalsFor(currency, contributions, expenses, input.goal)),
    expenses: sortedExpenses,
    expenseCount: expenses.length,
    receiptCount: expenses.reduce((total, item) => total + item.receiptCount, 0),
    byCategory,
    reconciledAt: input.reconciledAt,
    reconciliationIsStale: isReconciliationStale(input.reconciledAt, input.now),
    isEmpty: contributions.length === 0 && expenses.length === 0,
  };
}

/**
 * Sin conciliación no hay dato que envejecer: devuelve `false` y la interfaz
 * explica que todavía no hubo conciliación, que es distinto de un dato viejo.
 */
export function isReconciliationStale(reconciledAt: string | null, now = new Date()): boolean {
  if (reconciledAt === null) {
    return false;
  }

  const reconciled = new Date(reconciledAt).getTime();

  if (Number.isNaN(reconciled)) {
    return false;
  }

  const days = (now.getTime() - reconciled) / 86_400_000;

  return days > STALE_RECONCILIATION_DAYS;
}

export { STALE_RECONCILIATION_DAYS };
