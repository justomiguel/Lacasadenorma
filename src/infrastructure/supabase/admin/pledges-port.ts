import { isCoverChannel } from "@/src/domain/cover";
import type { DonationOffer } from "@/src/domain/entities/donation-offer";
import type { AdminPledgeRecord } from "@/src/domain/entities/donation-pledge";
import {
  CatalogNoRoomError,
  PledgeContactRequiredError,
  PledgeUnavailableError,
} from "@/src/domain/errors";
import { isPledgeStatus } from "@/src/domain/pledge-status";
import type { AdminDonationsPort } from "@/src/domain/ports/donations";

import type { Database } from "../database.types";
import type { ServerSupabaseClient } from "../server-client";
import { QueryError } from "./query";

const COLUMNS =
  "id, item_id, user_id, quantity, status, is_anonymous, donor_display_name, donor_note, cover_channel, contact_name, contact_phone, pickup_address, expires_at, reminded_at, fulfilled_at, cancelled_at, cancel_reason, created_at";

type PledgeRow = Pick<
  Database["public"]["Tables"]["donation_pledges"]["Row"],
  | "id"
  | "item_id"
  | "user_id"
  | "quantity"
  | "status"
  | "is_anonymous"
  | "donor_display_name"
  | "donor_note"
  | "cover_channel"
  | "contact_name"
  | "contact_phone"
  | "pickup_address"
  | "expires_at"
  | "reminded_at"
  | "fulfilled_at"
  | "cancelled_at"
  | "cancel_reason"
  | "created_at"
>;

interface PledgeWithItem extends PledgeRow {
  donation_items: { title: string } | { title: string }[] | null;
}

interface OfferWithItem {
  id: string;
  item_id: string;
  contact_name: string;
  contact_phone: string;
  created_at: string;
  pledge_id: string | null;
  donation_items: { title: string } | { title: string }[] | null;
}

export function createPledgesPort(client: ServerSupabaseClient): AdminDonationsPort {
  return {
    async listPledges(): Promise<readonly AdminPledgeRecord[]> {
      const { data, error } = await client
        .from("donation_pledges")
        .select(`${COLUMNS}, donation_items(title)`)
        .order("created_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer las reservas", error);
      }

      const rows = data as PledgeWithItem[];

      return Promise.all(
        rows.map(async (row) => {
          const email =
            row.user_id === null ? null : await contactOf(client, row.user_id);

          return mapAdminPledge(row, email);
        }),
      );
    },

    async listOffers(): Promise<readonly DonationOffer[]> {
      const { data, error } = await client
        .from("donation_offers")
        .select(
          "id, item_id, contact_name, contact_phone, created_at, pledge_id, donation_items(title)",
        )
        .order("created_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer los avisos por teléfono", error);
      }

      return data.map((row) => mapOffer(row as OfferWithItem));
    },

    async acceptPledge(input): Promise<void> {
      const { error } = await client.rpc("accept_donation_pledge", {
        p_pledge_id: input.id,
        p_display_name: input.displayName as string,
        p_note: input.note as string,
      });

      if (error !== null) {
        throw new QueryError("confirmar que van a donar", error);
      }
    },

    async fulfillPledge(input): Promise<void> {
      const { error } = await client.rpc("fulfill_donation_pledge", {
        p_pledge_id: input.id,
      });

      if (error !== null) {
        throw new QueryError("confirmar la llegada", error);
      }
    },

    async cancelPledge(input): Promise<void> {
      const { error } = await client.rpc("cancel_donation_pledge", {
        p_pledge_id: input.id,
        p_reason: input.reason,
      });

      if (error !== null) {
        throw new QueryError("cancelar la reserva", error);
      }
    },

    async updatePledge(input): Promise<void> {
      const { error } = await client.rpc("update_donation_pledge", {
        p_pledge_id: input.id,
        p_quantity: input.quantity,
        p_note: input.note as string,
        p_contact_name: input.contactName as string,
        p_contact_phone: input.contactPhone as string,
      });

      if (error !== null) {
        if (error.message === "sin_disponibilidad") {
          throw new PledgeUnavailableError();
        }

        if (error.message === "datos_de_retiro") {
          throw new PledgeContactRequiredError();
        }

        throw new QueryError("editar la reserva", error);
      }
    },

    async revertPledge(input): Promise<void> {
      const { error } = await client.rpc("revert_donation_pledge", {
        p_pledge_id: input.id,
        p_reason: input.reason,
      });

      if (error !== null) {
        throw new QueryError("revertir la donación", error);
      }
    },

    async markReminded(id): Promise<void> {
      const { error } = await client.rpc("mark_pledge_reminded", {
        p_pledge_id: id,
      });

      if (error !== null) {
        throw new QueryError("marcar el recordatorio", error);
      }
    },

    async deletePledge(id): Promise<void> {
      const { error } = await client.rpc("delete_donation_pledge", {
        p_pledge_id: id,
      });

      if (error !== null) {
        throw new QueryError("borrar la reserva", error);
      }
    },

    async deleteOffer(id): Promise<void> {
      const { error } = await client.rpc("delete_donation_offer", {
        p_offer_id: id,
      });

      if (error !== null) {
        throw new QueryError("borrar el aviso", error);
      }
    },

    async recordArrival(input): Promise<string> {
      const { data, error } = await client.rpc("record_donor_arrival", {
        p_user_id: input.userId,
        p_item_id: input.itemId,
        p_quantity: input.quantity,
        p_display_name: input.displayName as string,
      });

      if (error !== null) {
        if (error.message === "sin_cupo") {
          throw new CatalogNoRoomError();
        }

        throw new QueryError("anotar la llegada", error);
      }

      if (data === null) {
        throw new QueryError("anotar la llegada", {
          message: "la función no devolvió identificador",
        });
      }

      return data;
    },
  };
}

async function contactOf(
  client: ServerSupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client.rpc("donor_contact", { p_user_id: userId });

  if (error !== null) {
    throw new QueryError("leer el correo de contacto", error);
  }

  return typeof data === "string" ? data : null;
}

function titleOf(row: PledgeWithItem): string {
  return relatedTitle(row.donation_items);
}

function mapOffer(row: OfferWithItem): DonationOffer {
  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle: relatedTitle(row.donation_items),
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    pledgeId: row.pledge_id,
    createdAt: row.created_at,
  };
}

function relatedTitle(related: { title: string } | { title: string }[] | null): string {
  if (related === null) {
    return "Ítem";
  }

  return Array.isArray(related) ? (related[0]?.title ?? "Ítem") : related.title;
}

function mapAdminPledge(row: PledgeWithItem, email: string | null): AdminPledgeRecord {
  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle: titleOf(row),
    quantity: row.quantity,
    status: isPledgeStatus(row.status) ? row.status : "reserved",
    isAnonymous: row.is_anonymous,
    donorDisplayName: row.donor_display_name,
    donorNote: row.donor_note,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    pickupAddress: row.pickup_address,
    expiresAt: row.expires_at,
    remindedAt: row.reminded_at,
    fulfilledAt: row.fulfilled_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    userId: row.user_id,
    contactEmail: email,
    coverChannel: isCoverChannel(row.cover_channel) ? row.cover_channel : "bring",
  };
}
