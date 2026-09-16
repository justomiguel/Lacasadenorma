import type { DonationOffer } from "@/src/domain/entities/donation-offer";
import type { OfferInput, OffersPort } from "@/src/domain/ports/donations";

import { QueryError } from "./admin/query";
import type { Database } from "./database.types";
import type { ServerSupabaseClient } from "./server-client";

type OfferRow = Database["public"]["Functions"]["offer_donation_item"]["Returns"][number];

/**
 * Avisos por teléfono, sin sesión (ADR-051).
 *
 * `anon` no inserta en la tabla: la función es la única vía, y reserva a
 * nombre de esa persona, como `claim_donation_item` para las reservas con
 * cuenta.
 */

export function createOffersPort(client: ServerSupabaseClient): OffersPort {
  return {
    async offerItem(input: OfferInput): Promise<DonationOffer> {
      const { data, error } = await client.rpc("offer_donation_item", {
        p_item_id: input.itemId,
        p_contact_name: input.contactName,
        p_contact_phone: input.contactPhone,
      });

      if (error !== null) {
        throw new QueryError("avisar por teléfono", error);
      }

      const row = firstOfferRow(data);

      if (row === null) {
        throw new QueryError("avisar por teléfono", {
          message: "la función no devolvió fila",
        });
      }

      return {
        id: row.id,
        itemId: row.item_id,
        itemTitle: row.item_title,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        pledgeId: row.pledge_id,
        createdAt: row.created_at,
      };
    },
  };
}

function firstOfferRow(data: OfferRow[] | OfferRow | null): OfferRow | null {
  if (data === null) {
    return null;
  }

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
}
