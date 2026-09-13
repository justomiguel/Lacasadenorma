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
}

export interface DonationsPort {
  claimItem(input: ClaimInput): Promise<DonationPledge>;
  listOwnPledges(): Promise<readonly OwnPledge[]>;
  cancelOwnPledge(pledgeId: string): Promise<void>;
}

/**
 * Las reservas desde el backoffice. Confirmar llegada y cancelar con motivo
 * piden `donaciones.escribir`; listar pide `donaciones.leer`.
 */
export interface AdminDonationsPort {
  listPledges(): Promise<readonly AdminPledgeRecord[]>;
  fulfillPledge(id: string): Promise<void>;
  cancelPledge(input: { id: string; reason: string }): Promise<void>;
  markReminded(id: string): Promise<void>;
}
