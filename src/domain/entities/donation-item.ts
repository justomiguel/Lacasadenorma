import type { MediaAsset } from "./media";
import type { Money } from "../money";

/**
 * Un ítem del catálogo de donaciones en especie.
 *
 * Lo que falta, en qué unidad y cuánto. El valor estimado **no está acá**: no se
 * publica (D3). Quien administra lo ve en `DonationItemAdminRecord`.
 */

export const DONATION_UNITS = [
  "unidad",
  "metro",
  "metro_cuadrado",
  "bolsa",
  "litro",
  "juego",
] as const;

export type DonationUnit = (typeof DONATION_UNITS)[number];

export const DONATION_UNIT_LABELS: Record<DonationUnit, string> = {
  unidad: "unidad",
  metro: "metro",
  metro_cuadrado: "metro cuadrado",
  bolsa: "bolsa",
  litro: "litro",
  juego: "juego",
};

export interface ItemQuantities {
  readonly needed: number;
  readonly reserved: number;
  readonly fulfilled: number;
}

export interface DonationItem {
  readonly id: string;
  readonly campaignId: string;
  readonly budgetItemId: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly unit: DonationUnit;
  readonly neededQuantity: number;
  readonly remainingQuantity: number;
  readonly fulfilledQuantity: number;
  readonly photo: MediaAsset | null;
  readonly sortOrder: number;
}

/**
 * El mismo ítem visto desde el backoffice.
 *
 * Agrega lo que el público no tiene que ver: el valor de referencia, si está
 * publicado, cuánto hay reservado y el id de la foto para poder cambiarla.
 */
export interface DonationItemAdminRecord {
  readonly id: string;
  readonly campaignId: string;
  readonly budgetItemId: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly unit: DonationUnit;
  readonly neededQuantity: number;
  readonly reservedQuantity: number;
  readonly fulfilledQuantity: number;
  readonly remainingQuantity: number;
  readonly estimatedValue: Money | null;
  readonly photo: MediaAsset | null;
  readonly photoMediaId: string | null;
  readonly sortOrder: number;
  readonly publishedAt: string | null;
}
