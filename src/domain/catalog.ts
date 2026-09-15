import type { CatalogClaim } from "./entities/catalog-claim";
import {
  DONATION_ITEM_CATEGORIES,
  DONATION_UNITS,
  type DonationItemCategory,
  type ItemQuantities,
} from "./entities/donation-item";
import { DomainError } from "./errors";
import { isCurrencyCode, money, type Money } from "./money";

export type { CatalogClaim } from "./entities/catalog-claim";
export type {
  DonationItem,
  DonationItemAdminRecord,
  DonationItemCategory,
  DonationUnit,
  ItemQuantities,
} from "./entities/donation-item";
export {
  DONATION_ITEM_CATEGORIES,
  DONATION_ITEM_CATEGORY_LABELS,
  DONATION_UNITS,
  DONATION_UNIT_LABELS,
} from "./entities/donation-item";

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
 * Si alguien ya tomó unidades, y con qué nombres públicos.
 *
 * Lo anónimo no llega acá: la vista no lo nombra (FR-255). `taken` sale de las
 * cantidades, que sí son públicas, así que una reserva sin nombre se ve como
 * tomada y la columna de nombre queda vacía.
 */
export interface ItemTakenStatus {
  readonly taken: boolean;
  readonly names: readonly string[];
}

export function takenStatus(
  item: {
    readonly id: string;
    readonly neededQuantity: number;
    readonly remainingQuantity: number;
  },
  claims: readonly CatalogClaim[],
): ItemTakenStatus {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const claim of claims) {
    if (claim.itemId !== item.id || seen.has(claim.donorDisplayName)) {
      continue;
    }

    seen.add(claim.donorDisplayName);
    names.push(claim.donorDisplayName);
  }

  return {
    taken: item.remainingQuantity < item.neededQuantity,
    names: item.remainingQuantity < item.neededQuantity ? names : [],
  };
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

export function isDonationItemCategory(
  value: string,
): value is (typeof DONATION_ITEM_CATEGORIES)[number] {
  return (DONATION_ITEM_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Agrupa el catálogo público en el orden de las categorías (FR-253).
 * Una categoría sin ítems no aparece: no se reserva un hueco vacío.
 */
export interface CatalogCategoryGroup<T> {
  readonly category: DonationItemCategory;
  readonly items: readonly T[];
}

export function groupCatalogByCategory<
  T extends { readonly category: string; readonly sortOrder: number },
>(items: readonly T[]): readonly CatalogCategoryGroup<T>[] {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const current = grouped.get(item.category) ?? [];
    current.push(item);
    grouped.set(item.category, current);
  }

  return DONATION_ITEM_CATEGORIES.flatMap((category) => {
    const members = grouped.get(category);

    if (members === undefined || members.length === 0) {
      return [];
    }

    return [
      {
        category,
        items: [...members].sort((left, right) => left.sortOrder - right.sortOrder),
      },
    ];
  });
}

/**
 * La foto del listado y de la ficha: la subida desde el backoffice gana; si
 * no hay, la de referencia del tipo (ADR-043). El epígrafe —en la ficha— y
 * el caption de la tabla —en el listado— son lo que impide presentarla como
 * foto de esta casa.
 */

export function catalogItemPhotograph<T>(
  uploaded: T | null,
  reference: T | null,
): T | null {
  return uploaded ?? reference;
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
