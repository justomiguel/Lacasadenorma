import type { DonationWallEntry } from "@/src/domain/entities";
import type { DonationWallRepository } from "@/src/domain/ports/repositories";

import type { Database } from "./database.types";
import type { ServerSupabaseClient } from "./server-client";

/**
 * Lectura pública del muro. Consulta **la vista**, nunca la tabla, y enumera
 * las cinco columnas: un `select *` sobre `donation_pledges` lo rechaza la
 * base (ADR-030). El filtro de filas está en la policy, no acá.
 *
 * El título del ítem se pide aparte, por id, sobre `donation_items`. Si el
 * ítem dejó de estar publicado, `anon` no lo ve y la línea se queda con el
 * nombre y la cantidad, que siguen siendo un hecho sobre la obra.
 */

const WALL_COLUMNS = "id, item_id, quantity, donor_display_name, fulfilled_at";

type WallRow = Database["public"]["Views"]["donation_wall"]["Row"];

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

      const titles = await loadTitles(
        client,
        data.map((row) => row.item_id),
      );

      return data.flatMap((row) => {
        const entry = toEntry(row, titles);

        return entry === null ? [] : [entry];
      });
    },
  };
}

async function loadTitles(
  client: ServerSupabaseClient,
  ids: readonly (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))];

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from("donation_items")
    .select("id, title")
    .in("id", unique);

  if (error !== null) {
    throw new Error(`leer los ítems del muro: ${error.message}`);
  }

  return new Map(data.map((row) => [row.id, row.title]));
}

function toEntry(row: WallRow, titles: Map<string, string>): DonationWallEntry | null {
  if (
    row.id === null ||
    row.item_id === null ||
    row.quantity === null ||
    row.donor_display_name === null ||
    row.fulfilled_at === null
  ) {
    return null;
  }

  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle: titles.get(row.item_id) ?? null,
    quantity: row.quantity,
    donorDisplayName: row.donor_display_name,
    fulfilledAt: row.fulfilled_at,
  };
}
