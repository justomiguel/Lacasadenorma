import type { MediaAsset } from "./media";
import type { Money } from "../money";

/**
 * Un ítem del catálogo de donaciones en especie.
 *
 * Lo que falta, en qué unidad, de qué categoría y cuánto. El valor estimado
 * va en la ficha, etiquetado como estimado y no como precio fijo (ADR-041).
 * Quien administra lo carga en `DonationItemAdminRecord`.
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

const COUNTABLE_UNITS: ReadonlySet<DonationUnit> = new Set([
  "unidad",
  "bolsa",
  "juego",
]);

export function isCountableUnit(unit: DonationUnit): boolean {
  return COUNTABLE_UNITS.has(unit);
}

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
  readonly estimatedValue: Money | null;
  readonly photo: MediaAsset | null;
  readonly sortOrder: number;
}

/**
 * El mismo ítem visto desde el backoffice.
 *
 * Agrega lo que el listado no tiene que ver: si está publicado, cuánto hay
 * reservado y el id de la foto para poder cambiarla. El estimado sí se publica
 * en la ficha (ADR-041); acá se carga.
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
