import { z } from "zod";

import type { DonationOffer } from "@/src/domain/entities/donation-offer";
import type { Logger } from "@/src/domain/ports/logger";
import type { OffersPort } from "@/src/domain/ports/donations";
import { parseDonateStart } from "@/src/domain/donate-start";

import { accountError, accountOk, type AccountOutcome } from "../accounts/outcome";
import { describePledgeFailure } from "../accounts/pledge-failure";

/**
 * Avisar por teléfono que alguien quiere donar un ítem (ADR-051).
 *
 * No hay sesión. Reserva a nombre de esa persona. El correo al owner va
 * **después**: si no sale, la reserva ya está (FR-233).
 */

const inputSchema = z.object({
  itemId: z.string().uuid(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
});

export interface OfferDeps {
  readonly offers: OffersPort;
  readonly logger: Logger;
  readonly afterOffer?: (offer: DonationOffer) => Promise<void>;
}

export async function offerItemByPhone(
  deps: OfferDeps,
  input: unknown,
): Promise<AccountOutcome<DonationOffer>> {
  const parsed = inputSchema.safeParse(input);

  if (!parsed.success) {
    return accountError("failed");
  }

  const start = parseDonateStart({
    name: parsed.data.contactName,
    email: parsed.data.contactEmail,
    phone: parsed.data.contactPhone,
  });

  if (start.status === "error") {
    return start.field === "contactName"
      ? accountError("contactNameRequired", "contactName")
      : start.field === "email"
        ? accountError("emailInvalid", "email")
        : start.field === "contactPhone"
          ? accountError("phoneInvalid", "contactPhone")
          : accountError("contactChannelRequired", "contactChannel");
  }

  if (start.value.channel !== "phone") {
    return accountError("contactChannelRequired", "contactChannel");
  }

  try {
    const offer = await deps.offers.offerItem({
      itemId: parsed.data.itemId,
      contactName: start.value.name,
      contactPhone: start.value.phone,
    });

    if (deps.afterOffer !== undefined) {
      try {
        await deps.afterOffer(offer);
      } catch (error) {
        deps.logger.error("No se pudo avisar el teléfono", { error });
      }
    }

    return accountOk(offer);
  } catch (error) {
    return describePledgeFailure(deps, "avisar por teléfono", error);
  }
}
