import { DomainError } from "./errors";

/**
 * Porcentaje acotado a [0, 100].
 *
 * `ratioAsPercentage` devuelve `null` cuando no hay denominador. Es la regla más
 * importante de este módulo: mostrar `0%` porque el objetivo todavía no está
 * cargado sería una cifra falsa, y la constitución lo prohíbe.
 */

const MIN = 0;
const MAX = 100;

export function percentage(
  value: number,
  onOutOfRange?: (original: number) => void,
): number {
  if (!Number.isFinite(value)) {
    throw new DomainError(
      `Un porcentaje tiene que ser un número finito; se recibió ${String(value)}.`,
    );
  }

  if (value < MIN || value > MAX) {
    onOutOfRange?.(value);

    return Math.min(MAX, Math.max(MIN, value));
  }

  return value;
}

export function ratioAsPercentage(
  part: number,
  whole: number | null | undefined,
  onOutOfRange?: (original: number) => void,
): number | null {
  if (whole === null || whole === undefined || whole === 0) {
    return null;
  }

  return percentage((part / whole) * 100, onOutOfRange);
}

/**
 * Qué parte es un aporte de lo ya recibido, en entero truncado.
 *
 * Es la misma cuenta que `private.contribution_wall_for`: `(parte * 100) /
 * total` en enteros. Devuelve `null` cuando no hay denominador o cuando el
 * truncado es 0: publicar `0%` sería fingir un dato (ADR-042).
 */
export function shareOfReceived(
  amountMinor: bigint,
  receivedMinor: bigint,
): number | null {
  if (receivedMinor <= 0n || amountMinor <= 0n) {
    return null;
  }

  const pct = (amountMinor * 100n) / receivedMinor;

  if (pct < 1n) {
    return null;
  }

  return Number(pct > 100n ? 100n : pct);
}

export function formatPercentage(
  value: number,
  options?: { decimals?: number; locale?: string },
): string {
  const decimals = options?.decimals ?? 0;

  return new Intl.NumberFormat(options?.locale ?? "es-AR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Qué parte es una donación en especie de **ese** ítem, en entero truncado.
 *
 * Misma cuenta que la plata: `(parte * 100) / total` en enteros. Devuelve
 * `null` cuando no hay denominador o cuando el truncado es 0: publicar `0%`
 * sería fingir un dato (ADR-052).
 */
export function shareOfItem(
  quantity: number,
  needed: number | null | undefined,
): number | null {
  if (
    needed === null ||
    needed === undefined ||
    !Number.isInteger(quantity) ||
    !Number.isInteger(needed) ||
    quantity <= 0 ||
    needed <= 0
  ) {
    return null;
  }

  const pct = Math.trunc((quantity * 100) / needed);

  if (pct < 1) {
    return null;
  }

  return pct > 100 ? 100 : pct;
}
