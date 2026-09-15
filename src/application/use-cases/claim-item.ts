import { z } from "zod";

import { normalizeDisplayName } from "@/src/domain/entities/donor";
import type { DonationPledge } from "@/src/domain/entities/donation-pledge";
import type { DonationsPort } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";
import { parsePhysicalPledgeContact } from "@/src/domain/pledge-contact";

import { accountError, accountOk, type AccountOutcome } from "../accounts/outcome";
import type { AccountSession } from "../accounts/own-account";
import { describePledgeFailure } from "../accounts/pledge-failure";

/**
 * Reservar un ítem del catálogo para traerlo (ADR-046).
 *
 * Cubrir con plata no pasa por acá: la transacción es la prueba. Llama la
 * función de la base y **después** intenta el correo. El correo no está en
 * la transacción: si no sale, la reserva ya existe (ADR-028, FR-233).
 *
 * No pasa por `perform()`. `record_audit()` pide un rol interno, y el registro
 * de auditoría existe para responder "quién del equipo cambió esto". Una fila
 * que dijera que una persona del público se anotó a traer chapas sería
 * vigilancia. El backoffice deja rastro cuando confirma la llegada o cancela.
 */

const inputSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  anonymous: z.enum(["si", "no"]).optional(),
  displayName: z.string().nullable().optional(),
  note: z.string().max(500).optional(),
  coverChannel: z
    .enum(["bring", "transfer", "mercadopago", "paypal"])
    .optional()
    .default("bring"),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  pickupAddress: z.string().nullable().optional(),
});

export interface ClaimDeps {
  readonly session: AccountSession;
  readonly logger: Logger;
  readonly afterClaim?: (pledge: DonationPledge) => Promise<void>;
}

function readyDonations(deps: ClaimDeps): DonationsPort | AccountOutcome<never> {
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

export async function claimItem(
  deps: ClaimDeps,
  input: unknown,
): Promise<AccountOutcome<DonationPledge>> {
  const port = readyDonations(deps);

  if (isOutcome(port)) {
    return port;
  }

  const parsed = inputSchema.safeParse(input);

  if (!parsed.success) {
    const quantityIssue = parsed.error.issues.some(
      (issue) => issue.path[0] === "quantity",
    );

    return quantityIssue
      ? accountError("quantityInvalid", "quantity")
      : accountError("failed");
  }

  if (parsed.data.coverChannel !== "bring") {
    return accountError("coverIsNotAPledge");
  }

  const isAnonymous = parsed.data.anonymous !== "no";
  const displayName = normalizeDisplayName(parsed.data.displayName);
  const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;
  const contact = parsePhysicalPledgeContact({
    contactName: parsed.data.contactName,
    contactPhone: parsed.data.contactPhone,
    pickupAddress: parsed.data.pickupAddress,
  });

  if (contact.status === "error") {
    return contact.field === "contactName"
      ? accountError("contactNameRequired", "contactName")
      : accountError("pickupAddressRequired", "pickupAddress");
  }

  if (!isAnonymous && displayName === null) {
    return accountError("displayNameRequired", "displayName");
  }

  try {
    const pledge = await port.claimItem({
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      isAnonymous,
      displayName,
      note,
      coverChannel: "bring",
      contactName: contact.value.contactName,
      contactPhone: contact.value.contactPhone,
      pickupAddress: contact.value.pickupAddress,
    });

    if (deps.afterClaim !== undefined) {
      try {
        await deps.afterClaim(pledge);
      } catch (error) {
        deps.logger.error("No se pudo avisar la reserva", { error });
      }
    }

    return accountOk(pledge);
  } catch (error) {
    return describePledgeFailure(deps, "reservar", error);
  }
}
