import type { AdminPledgeRecord } from "@/src/domain/entities/donation-pledge";
import { isPledgeStatus } from "@/src/domain/pledge-status";
import type { AdminDonationsPort } from "@/src/domain/ports/donations";

import type { Database } from "../database.types";
import type { ServerSupabaseClient } from "../server-client";
import { QueryError } from "./query";

const COLUMNS =
  "id, item_id, user_id, quantity, status, is_anonymous, donor_display_name, donor_note, expires_at, reminded_at, fulfilled_at, cancelled_at, cancel_reason, created_at";

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

    async fulfillPledge(id): Promise<void> {
      const { error } = await client.rpc("fulfill_donation_pledge", {
        p_pledge_id: id,
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

    async markReminded(id): Promise<void> {
      const { error } = await client.rpc("mark_pledge_reminded", {
        p_pledge_id: id,
      });

      if (error !== null) {
        throw new QueryError("marcar el recordatorio", error);
      }
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
  const related = row.donation_items;

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
    expiresAt: row.expires_at,
    remindedAt: row.reminded_at,
    fulfilledAt: row.fulfilled_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    userId: row.user_id,
    contactEmail: email,
  };
}
