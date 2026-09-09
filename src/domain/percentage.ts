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

export function percentage(value: number, onOutOfRange?: (original: number) => void): number {
  if (!Number.isFinite(value)) {
    throw new DomainError(`Un porcentaje tiene que ser un número finito; se recibió ${String(value)}.`);
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

export function formatPercentage(value: number, options?: { decimals?: number }): string {
  const decimals = options?.decimals ?? 0;

  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}
