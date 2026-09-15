import {
  estimatedValueOf,
  isDonationItemCategory,
  remaining,
} from "@/src/domain/catalog";
import type { DonationItemAdminRecord } from "@/src/domain/entities";
import { CatalogOversubscribedError } from "@/src/domain/errors";
import type { AdminCatalogPort } from "@/src/domain/ports/admin";

import { loadPhotos } from "../catalog-repository";
import type { Database } from "../database.types";
import { MappingError } from "../mappers";
import type { ServerSupabaseClient } from "../server-client";
import { QueryError } from "./query";

const ITEM_COLUMNS =
  "id, campaign_id, budget_item_id, title, description, unit, category, needed_quantity, reserved_quantity, fulfilled_quantity, estimated_unit_amount_minor, currency, photo_media_id, sort_order, published_at";

type ItemRow = Pick<
  Database["public"]["Tables"]["donation_items"]["Row"],
  | "id"
  | "campaign_id"
  | "budget_item_id"
  | "title"
  | "description"
  | "unit"
  | "category"
  | "needed_quantity"
  | "reserved_quantity"
  | "fulfilled_quantity"
  | "estimated_unit_amount_minor"
  | "currency"
  | "photo_media_id"
  | "sort_order"
  | "published_at"
>;

export function createCatalogPort(client: ServerSupabaseClient): AdminCatalogPort {
  const publicUrlFor = (bucketId: string, storagePath: string): string =>
    client.storage.from(bucketId).getPublicUrl(storagePath).data.publicUrl;

  async function mapRows(rows: ItemRow[]): Promise<DonationItemAdminRecord[]> {
    const photos = await loadPhotos(
      client,
      rows.map((row) => row.photo_media_id),
      publicUrlFor,
    );

    return rows.map((row) => {
      if (!isDonationItemCategory(row.category)) {
        throw new MappingError(
          `donation_items.${row.id}: categoría desconocida "${String(row.category)}".`,
        );
      }

      const quantities = {
        needed: row.needed_quantity,
        reserved: row.reserved_quantity,
        fulfilled: row.fulfilled_quantity,
      };

      return {
        id: row.id,
        campaignId: row.campaign_id,
        budgetItemId: row.budget_item_id,
        title: row.title,
        description: row.description,
        unit: row.unit,
        category: row.category,
        neededQuantity: row.needed_quantity,
        reservedQuantity: row.reserved_quantity,
        fulfilledQuantity: row.fulfilled_quantity,
        remainingQuantity: remaining(quantities),
        estimatedValue: estimatedValueOf(row.estimated_unit_amount_minor, row.currency),
        photo:
          row.photo_media_id === null ? null : (photos.get(row.photo_media_id) ?? null),
        photoMediaId: row.photo_media_id,
        sortOrder: row.sort_order,
        publishedAt: row.published_at,
      };
    });
  }

  return {
    async listItems(campaignId): Promise<DonationItemAdminRecord[]> {
      const { data, error } = await client
        .from("donation_items")
        .select(ITEM_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new QueryError("leer el catálogo", error);
      }

      return mapRows(data);
    },

    async saveItem(input): Promise<string> {
      const row = {
        campaign_id: input.campaignId,
        title: input.title,
        description: input.description,
        unit: input.unit,
        category: input.category,
        needed_quantity: input.neededQuantity,
        budget_item_id: input.budgetItemId,
        estimated_unit_amount_minor: input.estimatedValue?.amountMinor ?? null,
        currency: input.estimatedValue?.currency ?? null,
        photo_media_id: input.photoMediaId,
        sort_order: input.sortOrder,
        published_at: input.publish ? new Date().toISOString() : null,
      };

      const { data, error } =
        input.id === null
          ? await client.from("donation_items").insert(row).select("id").single()
          : await client
              .from("donation_items")
              .update(row)
              .eq("id", input.id)
              .select("id")
              .single();

      if (error !== null) {
        if (error.code === "23514" && input.id !== null) {
          throw await oversubscribed(client, input.id);
        }

        throw new QueryError("guardar el ítem del catálogo", error);
      }

      return data.id;
    },
  };
}

async function oversubscribed(
  client: ServerSupabaseClient,
  id: string,
): Promise<CatalogOversubscribedError> {
  const { data } = await client
    .from("donation_items")
    .select("reserved_quantity, fulfilled_quantity")
    .eq("id", id)
    .maybeSingle();

  const committed = data === null ? 0 : data.reserved_quantity + data.fulfilled_quantity;

  return new CatalogOversubscribedError(committed);
}
