import type { DonationPledge, OwnPledge } from "@/src/domain/entities/donation-pledge";
import { isPledgeStatus } from "@/src/domain/pledge-status";
import type { ClaimInput, DonationsPort } from "@/src/domain/ports/donations";

import { QueryError } from "./admin/query";
import type { Database } from "./database.types";
import type { ServerSupabaseClient } from "./server-client";

const PLEDGE_COLUMNS =
  "id, item_id, quantity, status, is_anonymous, donor_display_name, donor_note, expires_at, reminded_at, fulfilled_at, cancelled_at, cancel_reason, created_at";

type PledgeRow = Pick<
  Database["public"]["Tables"]["donation_pledges"]["Row"],
  | "id"
  | "item_id"
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

export function createDonationsPort(client: ServerSupabaseClient): DonationsPort {
  async function requireUserId(): Promise<string> {
    const { data, error } = await client.auth.getClaims();

    if (error !== null || data === null) {
      throw new QueryError("leer la sesión", {
        message: error?.message ?? "sin claims",
      });
    }

    const subject = data.claims.sub;

    if (typeof subject !== "string" || subject.length === 0) {
      throw new QueryError("leer la sesión", { message: "el token no tiene sujeto" });
    }

    return subject;
  }

  async function titleOf(itemId: string): Promise<string> {
    const { data, error } = await client
      .from("donation_items")
      .select("title")
      .eq("id", itemId)
      .maybeSingle();

    if (error !== null) {
      throw new QueryError("leer el ítem reservado", error);
    }

    return data?.title ?? "Ítem";
  }

  return {
    async claimItem(input: ClaimInput): Promise<DonationPledge> {
      const { data, error } = await client.rpc("claim_donation_item", {
        p_item_id: input.itemId,
        p_quantity: input.quantity,
        p_is_anonymous: input.isAnonymous,
        p_display_name: input.displayName as string,
        p_note: input.note as string,
      });

      if (error !== null) {
        throw new QueryError("reservar el ítem", error);
      }

      if (data === null) {
        throw new QueryError("reservar el ítem", {
          message: "la función no devolvió fila",
        });
      }

      return mapPledge(data, await titleOf(data.item_id));
    },

    async listOwnPledges(): Promise<readonly OwnPledge[]> {
      const userId = await requireUserId();

      const { data, error } = await client
        .from("donation_pledges")
        .select(`${PLEDGE_COLUMNS}, donation_items(title)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer tus reservas", error);
      }

      return data.map((row) => mapPledge(row, titleFrom(row as PledgeWithItem)));
    },

    async cancelOwnPledge(pledgeId: string): Promise<void> {
      const { error } = await client.rpc("cancel_donation_pledge", {
        p_pledge_id: pledgeId,
      });

      if (error !== null) {
        throw new QueryError("cancelar la reserva", error);
      }
    },
  };
}

function titleFrom(row: PledgeWithItem): string {
  const related = row.donation_items;

  if (related === null) {
    return "Ítem";
  }

  return Array.isArray(related) ? (related[0]?.title ?? "Ítem") : related.title;
}

function mapPledge(row: PledgeRow, itemTitle: string): DonationPledge {
  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle,
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
  };
}
