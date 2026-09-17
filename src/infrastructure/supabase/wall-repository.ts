import type { ContributionWallEntry, DonationWallEntry } from "@/src/domain/entities";
import { isCurrencyCode } from "@/src/domain/money";
import { shareOfItem } from "@/src/domain/percentage";
import type { DonationWallRepository } from "@/src/domain/ports/repositories";

import type { Database } from "./database.types";
import type { ServerSupabaseClient } from "./server-client";

/**
 * Lectura pública del muro. Consulta **las vistas**, nunca las tablas.
 *
 * En especie: `donation_wall`, cinco columnas. Un `select *` sobre
 * `donation_pledges` lo rechaza la base (ADR-030). El % de ese ítem se
 * calcula en el dominio con `needed_quantity` ya público (ADR-052).
 *
 * En plata: `contribution_wall`, nombre y porcentaje opcional. Un `select`
 * sobre `contributions` lo rechaza la base (ADR-016, ADR-042). El monto no
 * existe en esta consulta.
 */

const WALL_COLUMNS = "id, item_id, quantity, donor_display_name, fulfilled_at";
const MONEY_WALL_COLUMNS =
  "id, donor_display_name, received_at, currency, percent_of_received";

type WallRow = Database["public"]["Views"]["donation_wall"]["Row"];
type MoneyWallRow = Pick<
  Database["public"]["Views"]["contribution_wall"]["Row"],
  "id" | "donor_display_name" | "received_at" | "currency" | "percent_of_received"
>;

export function createDonationWallRepository(
  client: ServerSupabaseClient,
): DonationWallRepository {
  return {
    async listEntries(): Promise<DonationWallEntry[]> {
      const { data, error } = await client
        .from("donation_wall")
        .select(WALL_COLUMNS)
        .order("fulfilled_at", { ascending: false });

      if (error !== null) {
        throw new Error(`leer el muro: ${error.message}`);
      }

      const items = await loadItems(
        client,
        data.map((row) => row.item_id),
      );

      return data.flatMap((row) => {
        const entry = toEntry(row, items);

        return entry === null ? [] : [entry];
      });
    },

    async listMoneyEntries(campaignId): Promise<ContributionWallEntry[]> {
      const { data, error } = await client
        .from("contribution_wall")
        .select(MONEY_WALL_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("received_at", { ascending: false });

      if (error !== null) {
        throw new Error(`leer el muro de aportes: ${error.message}`);
      }

      return data.flatMap((row) => {
        const entry = toMoneyEntry(row);

        return entry === null ? [] : [entry];
      });
    },
  };
}

async function loadItems(
  client: ServerSupabaseClient,
  ids: readonly (string | null)[],
): Promise<Map<string, { title: string; needed: number }>> {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))];

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from("donation_items")
    .select("id, title, needed_quantity")
    .in("id", unique);

  if (error !== null) {
    throw new Error(`leer los ítems del muro: ${error.message}`);
  }

  return new Map(
    data.map((row) => [row.id, { title: row.title, needed: row.needed_quantity }]),
  );
}

function toEntry(
  row: WallRow,
  items: Map<string, { title: string; needed: number }>,
): DonationWallEntry | null {
  if (
    row.id === null ||
    row.item_id === null ||
    row.quantity === null ||
    row.donor_display_name === null ||
    row.fulfilled_at === null
  ) {
    return null;
  }

  const item = items.get(row.item_id);

  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle: item?.title ?? null,
    quantity: row.quantity,
    percentOfItem: shareOfItem(row.quantity, item?.needed ?? null),
    donorDisplayName: row.donor_display_name,
    fulfilledAt: row.fulfilled_at,
  };
}

function toMoneyEntry(row: MoneyWallRow): ContributionWallEntry | null {
  if (
    row.id === null ||
    row.donor_display_name === null ||
    row.received_at === null ||
    row.currency === null
  ) {
    return null;
  }

  const currency = row.currency.trim();

  if (!isCurrencyCode(currency)) {
    return null;
  }

  const percent = row.percent_of_received;

  return {
    id: row.id,
    donorDisplayName: row.donor_display_name,
    receivedAt: row.received_at,
    currency,
    percentOfReceived: percent === null || percent < 1 ? null : percent,
  };
}
