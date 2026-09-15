import type { MediaAsset } from "./media";
import type { Money } from "../money";

/**
 * Un ítem del catálogo de donaciones en especie.
 *
 * Lo que falta, en qué unidad, de qué categoría y cuánto. El valor estimado
 * **no está acá**: no se publica (D3). Quien administra lo ve en
 * `DonationItemAdminRecord`.
 */

export const DONATION_UNITS = [
  "unidad",
  "metro",
  "metro_cuadrado",
  "metro_cubico",
  "bolsa",
  "litro",
  "juego",
] as const;

export type DonationUnit = (typeof DONATION_UNITS)[number];

export const DONATION_UNIT_LABELS: Record<DonationUnit, string> = {
  unidad: "unidad",
  metro: "metro",
  metro_cuadrado: "metro cuadrado",
  metro_cubico: "metro cúbico",
  bolsa: "bolsa",
  litro: "litro",
  juego: "juego",
};

/**
 * El orden del array es el de `/catalogo` (FR-253): primero la obra, después
 * lo que se habita.
 */
export const DONATION_ITEM_CATEGORIES = [
  "materiales",
  "aberturas",
  "instalaciones",
  "electrodomesticos",
  "muebles",
  "ajuar",
] as const;

export type DonationItemCategory = (typeof DONATION_ITEM_CATEGORIES)[number];

export const DONATION_ITEM_CATEGORY_LABELS: Record<DonationItemCategory, string> = {
  materiales: "Materiales",
  aberturas: "Aberturas",
  instalaciones: "Instalaciones",
  electrodomesticos: "Electrodomésticos",
  muebles: "Muebles",
  ajuar: "Ajuar y lo cotidiano",
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
  readonly category: DonationItemCategory;
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
  readonly category: DonationItemCategory;
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
