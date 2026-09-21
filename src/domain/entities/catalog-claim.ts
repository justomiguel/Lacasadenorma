/**
 * Una anotación pública sobre un ítem: alguien se comprometió o ya trajo, y
 * eligió aparecer con nombre.
 *
 * No hay correo, no hay `user_id`, no hay nota. Esas columnas no existen en
 * la vista `donation_catalog_claims` y `anon` no tiene privilegio para
 * nombrarlas (ADR-030, FR-255). `fulfilledAt` nulo es reserva; con fecha,
 * ya llegó.
 */

export interface CatalogClaim {
  readonly id: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly donorDisplayName: string;
  readonly fulfilledAt: string | null;
  readonly hasPortrait: boolean;
}
