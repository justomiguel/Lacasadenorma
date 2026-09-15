import type { CurrencyCode } from "../money";

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

/**
 * Una línea del muro de aportes en plata.
 *
 * No hay monto. `percentOfReceived` es nulo cuando la campaña no publica el %,
 * cuando no hay recibido en esa moneda, o cuando el truncado es 0 (ADR-042).
 */
export interface ContributionWallEntry {
  readonly id: string;
  readonly donorDisplayName: string;
  readonly receivedAt: string;
  readonly currency: CurrencyCode;
  readonly percentOfReceived: number | null;
}

/** Cuántas líneas se adelantan en `/catalogo` y en `/ayudar`. El resto está en la página. */
export const WALL_PREVIEW_COUNT = 4;
