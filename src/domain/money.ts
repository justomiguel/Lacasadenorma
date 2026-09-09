import { DomainError } from "./errors";

/**
 * Dinero: entero en la unidad mínima más su moneda. Nunca `float`.
 *
 * El parámetro de tipo `C` no es decorativo: `addMoney(pesos, dolares)` es un
 * error de compilación porque TypeScript no puede inferir un único `C` para los
 * dos argumentos. La validación en runtime existe igual, porque los montos que
 * vienen de la base entran al dominio sin pasar por el compilador.
 */

export const CURRENCIES = ["ARS", "USD", "CLP"] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export interface Money<C extends CurrencyCode = CurrencyCode> {
  readonly amountMinor: number;
  readonly currency: C;
}

/** Cuántos dígitos decimales tiene la unidad mínima de cada moneda. */
const MINOR_UNIT_DIGITS: Record<CurrencyCode, number> = {
  ARS: 2,
  USD: 2,
  CLP: 0,
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function money<C extends CurrencyCode>(amountMinor: number, currency: C): Money<C> {
  if (!Number.isInteger(amountMinor)) {
    throw new DomainError(
      `El monto tiene que ser un entero en la unidad mínima; se recibió ${String(amountMinor)}.`,
    );
  }

  if (!Number.isSafeInteger(amountMinor)) {
    throw new DomainError(
      `El monto ${String(amountMinor)} excede el entero seguro de JavaScript y perdería precisión.`,
    );
  }

  return { amountMinor, currency };
}

export function zero<C extends CurrencyCode>(currency: C): Money<C> {
  return { amountMinor: 0, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new DomainError(
      `No se pueden combinar montos de monedas distintas (${a.currency} y ${b.currency}). ` +
        "Una conversión requiere un tipo de cambio explícito y fechado.",
    );
  }
}

export function addMoney<C extends CurrencyCode>(a: Money<C>, b: Money<C>): Money<C> {
  assertSameCurrency(a, b);

  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney<C extends CurrencyCode>(a: Money<C>, b: Money<C>): Money<C> {
  assertSameCurrency(a, b);

  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function sumMoney<C extends CurrencyCode>(
  amounts: readonly Money<C>[],
  currency: C,
): Money<C> {
  return amounts.reduce<Money<C>>((total, amount) => addMoney(total, amount), zero(currency));
}

export function isPositive(amount: Money): boolean {
  return amount.amountMinor > 0;
}

/**
 * Formato es-AR. Los centavos se muestran sólo si existen: "$ 1.240.000" se lee
 * mejor que "$ 1.240.000,00" y no pierde información.
 */
export function formatMoney(amount: Money): string {
  const digits = MINOR_UNIT_DIGITS[amount.currency];
  const divisor = 10 ** digits;
  const major = amount.amountMinor / divisor;
  const hasFraction = digits > 0 && amount.amountMinor % divisor !== 0;

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: amount.currency,
    minimumFractionDigits: hasFraction ? digits : 0,
    maximumFractionDigits: hasFraction ? digits : 0,
  })
    .format(major)
    .replace(/\u00a0/g, " ");
}

/** Sólo el número, sin símbolo. Para tablas donde la moneda está en el encabezado. */
export function formatAmount(amount: Money): string {
  const digits = MINOR_UNIT_DIGITS[amount.currency];
  const divisor = 10 ** digits;
  const hasFraction = digits > 0 && amount.amountMinor % divisor !== 0;

  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: hasFraction ? digits : 0,
    maximumFractionDigits: hasFraction ? digits : 0,
  }).format(amount.amountMinor / divisor);
}
