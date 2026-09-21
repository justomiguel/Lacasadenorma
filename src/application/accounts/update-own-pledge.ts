import type { DonationsPort, UpdateOwnPledgeInput } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";

import { accountError, accountOk, type AccountOutcome } from "./outcome";
import type { AccountSession } from "./own-account";
import { describePledgeFailure } from "./pledge-failure";

/**
 * Editar cantidad y nota de una reserva propia.
 *
 * Solo llega al puerto si hay sesión y la cantidad es un entero ≥ 1. El
 * recorte de la nota es de esta capa: vacío significa `null`, no cadena
 * vacía. El rastro lo deja el backoffice cuando edita una ajena.
 */

export interface UpdateOwnPledgeDeps {
  readonly session: AccountSession;
  readonly logger: Logger;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function readyDonations(
  deps: UpdateOwnPledgeDeps,
): DonationsPort | AccountOutcome<never> {
  if (deps.session.status === "not-configured") {
    return accountError("notConfigured");
  }

  if (deps.session.status === "anonymous") {
    return accountError("noSession");
  }

  return deps.session.donations;
}

function isOutcome(value: unknown): value is AccountOutcome<never> {
  return typeof value === "object" && value !== null && "status" in value;
}

function noteOf(note: string | null): string | null {
  if (note === null) {
    return null;
  }

  const trimmed = note.trim();

  return trimmed.length === 0 ? null : trimmed;
}

export async function updateOwnPledge(
  deps: UpdateOwnPledgeDeps,
  input: UpdateOwnPledgeInput,
): Promise<AccountOutcome<null>> {
  const port = readyDonations(deps);

  if (isOutcome(port)) {
    return port;
  }

  if (!UUID.test(input.pledgeId)) {
    return accountError("failed");
  }

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return accountError("quantityInvalid", "quantity");
  }

  try {
    await port.updateOwnPledge({
      pledgeId: input.pledgeId,
      quantity: input.quantity,
      note: noteOf(input.note),
    });

    return accountOk(null);
  } catch (error) {
    return describePledgeFailure(deps, "editar la reserva", error);
  }
}
