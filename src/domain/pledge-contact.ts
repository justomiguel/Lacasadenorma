import { normalizeDisplayName } from "./entities/donor";

/**
 * Lo que hace falta para ir a buscar un bien físico (ADR-046).
 *
 * El correo de la cuenta satisface «mail o teléfono». El teléfono es para
 * llamar. La dirección es el dato sin el cual el equipo no puede ir.
 * Nada de esto se publica.
 */

export interface PhysicalPledgeContact {
  readonly contactName: string;
  readonly contactPhone: string | null;
  readonly pickupAddress: string;
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

  if (pickupAddress === null) {
    return { status: "error", field: "pickupAddress" };
  }

  return {
    status: "ok",
    value: { contactName, contactPhone, pickupAddress },
  };
}
