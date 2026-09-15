import type { BudgetItem } from "./entities";
import { ratioAsPercentage } from "./percentage";

/**
 * Parte de un total conocido. Si no hay denominador, no hay porcentaje: un 0%
 * por falta de dato sería una cifra falsa (ADR-040).
 */

export function quotedBudgetShares(
  items: readonly BudgetItem[],
  onOutOfRange?: (value: number) => void,
): readonly { readonly id: string; readonly percentOfQuoted: number | null }[] {
  const quoted = items.filter((item) => item.estimatedAmount !== null);
  const currency = quoted[0]?.estimatedAmount?.currency;
  const whole = quoted
    .filter((item) => item.estimatedAmount?.currency === currency)
    .reduce((sum, item) => sum + (item.estimatedAmount?.amountMinor ?? 0), 0);

  return items.map((item) => {
    const amount = item.estimatedAmount;

    if (amount === null || amount.currency !== currency) {
      return { id: item.id, percentOfQuoted: null };
    }

    return {
      id: item.id,
      percentOfQuoted: ratioAsPercentage(amount.amountMinor, whole || null, onOutOfRange),
    };
  });
}
