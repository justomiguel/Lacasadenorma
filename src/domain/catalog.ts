import { DONATION_UNITS, type ItemQuantities } from "./entities/donation-item";
import { DomainError } from "./errors";
import { isCurrencyCode, money, type Money } from "./money";

export type {
  DonationItem,
  DonationItemAdminRecord,
  DonationUnit,
  ItemQuantities,
} from "./entities/donation-item";
export { DONATION_UNITS, DONATION_UNIT_LABELS } from "./entities/donation-item";

/**
 * Cuánto falta de un ítem.
 *
 * La resta vive también en la vista `donation_catalog`. Esta función es el
 * espejo en el dominio: la interfaz no ofrece reservar cuando da cero, y un
 * valor negativo no puede llegar a la pantalla aunque un bug hubiera pasado el
 * `check` de la base (FR-210, FR-211).
 */
export function remaining(quantities: ItemQuantities): number {
  assertQuantities(quantities);

  return Math.max(0, quantities.needed - quantities.reserved - quantities.fulfilled);
}

/** No queda nada por pedir. Un ítem cubierto se sigue mostrando; no se ofrece. */
export function isCovered(quantities: ItemQuantities): boolean {
  return remaining(quantities) === 0;
}

/** La interfaz ofrece reservar sólo cuando queda algo. */
export function canClaim(quantities: ItemQuantities): boolean {
  return remaining(quantities) > 0;
}

/**
 * El valor de referencia interno, o nada.
 *
 * Nulo es "no hay valor cargado", nunca cero. Inventar un monto para un ítem
 * que no lo tiene sería publicar una cifra que nadie verificó (FR-214).
 */
export function estimatedValueOf(
  amountMinor: number | null,
  currency: string | null,
): Money | null {
  if (amountMinor === null && currency === null) {
    return null;
  }

  if (amountMinor === null || currency === null || !isCurrencyCode(currency)) {
    throw new DomainError(
      "Un valor estimado tiene que traer monto y moneda, o no traer ninguno.",
    );
  }

  return money(amountMinor, currency);
}

export function isDonationUnit(value: string): value is (typeof DONATION_UNITS)[number] {
  return (DONATION_UNITS as readonly string[]).includes(value);
}

function assertQuantities({ needed, reserved, fulfilled }: ItemQuantities): void {
  if (!Number.isInteger(needed) || needed <= 0) {
    throw new DomainError("La cantidad necesaria tiene que ser un entero positivo.");
  }

  if (!Number.isInteger(reserved) || reserved < 0) {
    throw new DomainError("Lo reservado no puede ser negativo.");
  }

  if (!Number.isInteger(fulfilled) || fulfilled < 0) {
    throw new DomainError("Lo entregado no puede ser negativo.");
  }
}
