/**
 * Un aviso por teléfono: alguien quiere donar un ítem y no abre cuenta
 * (ADR-051). Reserva a su nombre. El número no se publica.
 */

export interface DonationOffer {
  readonly id: string;
  readonly itemId: string;
  readonly itemTitle: string;
  readonly contactName: string;
  readonly contactPhone: string;
  readonly pledgeId: string | null;
  readonly createdAt: string;
}
