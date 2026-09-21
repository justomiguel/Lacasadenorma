import type { CoverChannel } from "../cover";
import type { DonationOffer } from "../entities/donation-offer";
import type {
  AdminPledgeRecord,
  DonationPledge,
  OwnPledge,
} from "../entities/donation-pledge";

/**
 * Lo que la aplicación puede hacer con **las reservas de quien está pidiendo**.
 *
 * Ningún método recibe un identificador de persona: el sujeto sale de la sesión
 * verificada, del lado del adaptador. Las policies de `donation_pledges` lo
 * vuelven a comprobar. Crear una reserva no es un `insert`: es
 * `claim_donation_item()`, la única vía (ADR-029).
 */
export interface ClaimInput {
  readonly itemId: string;
  readonly quantity: number;
  readonly isAnonymous: boolean;
  readonly displayName: string | null;
  readonly note: string | null;
  readonly coverChannel: CoverChannel;
  readonly contactName: string | null;
  readonly contactPhone: string | null;
  readonly pickupAddress: string | null;
}

export interface OwnAppearance {
  readonly isAnonymous: boolean;
  readonly displayName: string | null;
}

export interface OfferInput {
  readonly itemId: string;
  readonly contactName: string;
  readonly contactPhone: string;
}

export interface UpdateOwnPledgeInput {
  readonly pledgeId: string;
  readonly quantity: number;
  readonly note: string | null;
}

export interface UpdatePledgeInput {
  readonly id: string;
  readonly quantity: number;
  readonly note: string | null;
  readonly contactName: string | null;
  readonly contactPhone: string | null;
}

/**
 * Avisos por teléfono, sin cuenta (ADR-051). El sujeto no sale de la sesión:
 * no hay sesión. La función de la base reserva a nombre de esa persona.
 */
export interface OffersPort {
  offerItem(input: OfferInput): Promise<DonationOffer>;
}

export interface DonationsPort {
  claimItem(input: ClaimInput): Promise<DonationPledge>;
  listOwnPledges(): Promise<readonly OwnPledge[]>;
  cancelOwnPledge(pledgeId: string): Promise<void>;
  updateOwnPledge(input: UpdateOwnPledgeInput): Promise<void>;
  /**
   * Aplica el anonimato y el nombre a **todas** las reservas propias, también
   * a las que ya se entregaron. Es lo que hace que cambiar de opinión en
   * `/cuenta` se vea en el muro sin que intervenga nadie (FR-229).
   */
  updateOwnAppearance(next: OwnAppearance): Promise<void>;
}

/**
 * Las reservas desde el backoffice. Confirmar, cancelar, revertir y borrar piden
 * `donaciones.escribir`; listar pide `donaciones.leer`.
 */
export interface AdminDonationsPort {
  listPledges(): Promise<readonly AdminPledgeRecord[]>;
  listOffers(): Promise<readonly DonationOffer[]>;
  acceptPledge(input: {
    readonly id: string;
    readonly displayName: string | null;
    readonly note: string | null;
  }): Promise<void>;
  fulfillPledge(input: { readonly id: string }): Promise<void>;
  cancelPledge(input: { id: string; reason: string }): Promise<void>;
  updatePledge(input: UpdatePledgeInput): Promise<void>;
  revertPledge(input: { id: string; reason: string }): Promise<void>;
  markReminded(id: string): Promise<void>;
  deletePledge(id: string): Promise<void>;
  deleteOffer(id: string): Promise<void>;
  recordArrival(input: {
    readonly userId: string;
    readonly itemId: string;
    readonly quantity: number;
    readonly displayName: string | null;
  }): Promise<string>;
}
