import type { ExpenseCategory, ExpenseRecord } from "./entities";
import { EXPENSE_CATEGORIES } from "./entities";
import { subtractMoney, sumMoney, type CurrencyCode, type Money } from "./money";
import { ratioAsPercentage } from "./percentage";

/**
 * Agregación de la rendición de cuentas.
 *
 * Cuatro reglas la gobiernan, y las cuatro vienen de la spec:
 *
 * 1. Los gastos anulados no participan de ningún total (`voidedAt`).
 * 2. No se mezclan monedas. La moneda principal es la del objetivo; el resto se
 *    informa por separado, sin convertir, porque no hay tipo de cambio fechado.
 * 3. La suma del detalle publicado es exactamente el total publicado (SC-007).
 *    Por eso el detalle que se devuelve es el mismo array que se sumó, no una
 *    consulta distinta: dos consultas pueden divergir, un array no.
 * 4. **El total recibido es un dato de entrada, no algo que se derive acá.** No hay
 *    detalle público de aportes del que sumarlo: un aporte individual puede
 *    identificar a una persona (FR-014, amenaza I2), así que la cifra la calcula la
 *    base en una vista agregada. El dominio no finge poder derivarla (ADR-016).
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
  /**
   * Total recibido por moneda, tal como lo devuelve `campaign_totals`. Una moneda
   * ausente de la lista significa que no se recibió nada en ella, y se representa
   * omitiéndola, no con un cero: un cero explícito habría que escribirlo, y quien
   * lo escribe puede equivocarse.
   */
  readonly received: readonly Money[];
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

function receivedIn(received: readonly Money[], currency: CurrencyCode): Money {
  return sumMoney(
    received.filter((amount) => amount.currency === currency),
    currency,
  );
}

function totalsFor(
  currency: CurrencyCode,
  received: readonly Money[],
  expenses: readonly ExpenseRecord[],
  goal: Money | null,
  onOutOfRange?: (value: number) => void,
): CurrencyTotals {
  const receivedTotal = receivedIn(received, currency);
  const spent = sumMoney(
    expenses
      .filter((item) => item.amount.currency === currency)
      .map((item) => item.amount),
    currency,
  );

  // El porcentaje ejecutado sólo tiene sentido contra un objetivo en la misma
  // moneda. Si el objetivo está en otra, o no existe, se omite.
  const comparableGoal = goal !== null && goal.currency === currency ? goal : null;

  return {
    currency,
    received: receivedTotal,
    spent,
    balance: subtractMoney(receivedTotal, spent),
    executedPercent: ratioAsPercentage(
      spent.amountMinor,
      comparableGoal?.amountMinor ?? null,
      onOutOfRange,
    ),
  };
}

export function summarizeTransparency(
  input: SummarizeTransparencyInput,
): TransparencySummary {
  const expenses = input.expenses.filter(isLive);

  const primaryCurrency: CurrencyCode =
    input.goal?.currency ??
    input.defaultCurrency ??
    input.received[0]?.currency ??
    expenses[0]?.amount.currency ??
    "ARS";

  const presentCurrencies = new Set<CurrencyCode>([
    ...input.received.map((amount) => amount.currency),
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

  const totalReceived = input.received.reduce(
    (total, amount) => total + amount.amountMinor,
    0,
  );

  return {
    primary: totalsFor(
      primaryCurrency,
      input.received,
      expenses,
      input.goal,
      input.onOutOfRange,
    ),
    others: [...presentCurrencies]
      .sort()
      .map((currency) => totalsFor(currency, input.received, expenses, input.goal)),
    expenses: sortedExpenses,
    expenseCount: expenses.length,
    receiptCount: expenses.reduce((total, item) => total + item.receiptCount, 0),
    byCategory,
    reconciledAt: input.reconciledAt,
    reconciliationIsStale: isReconciliationStale(input.reconciledAt, input.now),
    isEmpty: totalReceived === 0 && expenses.length === 0,
  };
}

/**
 * Sin conciliación no hay dato que envejecer: devuelve `false` y la interfaz
 * explica que todavía no hubo conciliación, que es distinto de un dato viejo.
 */
export function isReconciliationStale(
  reconciledAt: string | null,
  now = new Date(),
): boolean {
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
