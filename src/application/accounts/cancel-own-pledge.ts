import type { DonationsPort } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";

import { accountError, accountOk, type AccountOutcome } from "./outcome";
import type { AccountSession } from "./own-account";
import { describePledgeFailure } from "./pledge-failure";

/**
 * Cancelar una reserva propia.
 *
 * El motivo lo pone la función de la base cuando quien cancela es dueña:
 * "Cancelada por quien reservó." El backoffice, si cancela una ajena, sí pide
 * motivo y deja rastro.
 */

export interface CancelOwnPledgeDeps {
  readonly session: AccountSession;
  readonly logger: Logger;
}

function readyDonations(
  deps: CancelOwnPledgeDeps,
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

export async function cancelOwnPledge(
  deps: CancelOwnPledgeDeps,
  pledgeId: string,
): Promise<AccountOutcome<null>> {
  const port = readyDonations(deps);

  if (isOutcome(port)) {
    return port;
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(pledgeId)
  ) {
    return accountError("failed");
  }

  try {
    await port.cancelOwnPledge(pledgeId);

    return accountOk(null);
  } catch (error) {
    return describePledgeFailure(deps, "cancelar la reserva", error);
  }
}
