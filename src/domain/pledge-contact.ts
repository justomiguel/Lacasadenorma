import { normalizeDisplayName } from "./entities/donor";

/**
 * Lo que hace falta para coordinar un bien físico (ADR-046, ADR-051).
 *
 * El correo de la cuenta satisface «mail o teléfono». El teléfono es para
 * llamar. La dirección, si alguna vez se cargó, se guarda; la ficha ya no
 * la pide. Nada de esto se publica.
 */

export interface PhysicalPledgeContact {
  readonly contactName: string;
  readonly contactPhone: string | null;
  readonly pickupAddress: string | null;
}

export type PledgeContactField = "contactName" | "contactPhone" | "pickupAddress";

export type PledgeContactError =
  | { readonly status: "ok"; readonly value: PhysicalPledgeContact }
  | { readonly status: "error"; readonly field: PledgeContactField };

export function parsePhysicalPledgeContact(input: {
  readonly contactName: string | null | undefined;
  readonly contactPhone: string | null | undefined;
  readonly pickupAddress: string | null | undefined;
}): PledgeContactError {
  const contactName = normalizeDisplayName(input.contactName);
  const pickupAddress = normalizeDisplayName(input.pickupAddress);
  const contactPhone = normalizeDisplayName(input.contactPhone);

  if (contactName === null) {
    return { status: "error", field: "contactName" };
  }

  return {
    status: "ok",
    value: { contactName, contactPhone, pickupAddress },
  };
}
