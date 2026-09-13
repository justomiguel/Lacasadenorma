/**
 * Una línea del muro público: quién trajo qué, cuando ya llegó.
 *
 * No hay correo, no hay `user_id`, no hay nota. Esas columnas no existen en
 * la vista `donation_wall` y `anon` no tiene privilegio para nombrarlas
 * (ADR-030). `itemTitle` puede ser nulo si el ítem dejó de estar publicado:
 * el nombre y la cantidad siguen siendo un hecho sobre la obra.
 */

export interface DonationWallEntry {
  readonly id: string;
  readonly itemId: string;
  readonly itemTitle: string | null;
  readonly quantity: number;
  readonly donorDisplayName: string;
  readonly fulfilledAt: string;
}

/** Cuántas líneas se adelantan en `/catalogo` y en `/ayudar`. El resto está en la página. */
export const WALL_PREVIEW_COUNT = 4;
