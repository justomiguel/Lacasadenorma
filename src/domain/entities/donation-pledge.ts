import type { CoverChannel } from "../cover";
import type { PledgeStatus } from "../pledge-status";

/**
 * El compromiso de traer un ítem.
 *
 * Lo que una persona se anotó a llevar, hasta cuándo, y si quiere aparecer.
 * El correo **no está acá**: vive en `auth.users` y el backoffice lo lee con
 * `donor_contact()`. La nota, el teléfono y la dirección de retiro son
 * privados para la familia y nunca públicos (ADR-046).
 */

export interface DonationPledge {
  readonly id: string;
  readonly itemId: string;
  readonly itemTitle: string;
  readonly quantity: number;
  readonly status: PledgeStatus;
  readonly isAnonymous: boolean;
  readonly donorDisplayName: string | null;
  readonly donorNote: string | null;
  readonly contactName: string | null;
  readonly contactPhone: string | null;
  readonly pickupAddress: string | null;
  readonly expiresAt: string;
  readonly remindedAt: string | null;
  readonly fulfilledAt: string | null;
  readonly cancelledAt: string | null;
  readonly cancelReason: string | null;
  readonly createdAt: string;
}

/** Lo que `/cuenta` muestra de cada reserva propia. */
export type OwnPledge = DonationPledge;

/** Lo que el backoffice muestra de una reserva, con el correo de contacto. */
export interface AdminPledgeRecord extends DonationPledge {
  readonly userId: string | null;
  readonly contactEmail: string | null;
  readonly coverChannel: CoverChannel;
}

/**
 * Catorce días. El plazo vive también en `claim_donation_item()` como
 * `interval '14 days'`. Los dos tienen que decir lo mismo: la interfaz cuenta
 * los días y la base los aplica.
 */
export const PLEDGE_HOLD_DAYS = 14;

/** Tope de reservas activas por cuenta. El mismo número está en la función. */
export const MAX_ACTIVE_PLEDGES = 5;

/** El recordatorio sale tres días antes de vencer, una sola vez (FR-235). */
export const PLEDGE_REMINDER_DAYS = 3;

export function isActivePledge(pledge: Pick<DonationPledge, "status">): boolean {
  return pledge.status === "reserved";
}
