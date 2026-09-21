import {
  estimatedValueOf,
  isDonationItemCategory,
  isDonationUnit,
  remaining,
} from "@/src/domain/catalog";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import type { CatalogRepository } from "@/src/domain/ports/repositories";

import { MEDIA_COLUMNS } from "./admin/columns";
import type { Database } from "./database.types";
import { MappingError, mapMedia, type MediaRow } from "./mappers";
import type { ServerSupabaseClient } from "./server-client";

/**
 * Lectura pública del catálogo. Consulta **la vista**, nunca la tabla. El
 * estimado entra a la vista para la ficha (ADR-041); el listado no lo muestra.
 *
 * El filtro de publicación está en la vista (`where published_at is not null`).
 * Esta consulta corre con el cliente anónimo, así que un editor con sesión en el
 * sitio público no ve borradores por este camino.
 */

const CATALOG_COLUMNS =
  "id, campaign_id, budget_item_id, title, description, unit, category, needed_quantity, remaining_quantity, fulfilled_quantity, estimated_unit_amount_minor, currency, photo_media_id, sort_order";

const CLAIM_COLUMNS =
  "id, item_id, quantity, donor_display_name, fulfilled_at, has_portrait";

type CatalogRow = Database["public"]["Views"]["donation_catalog"]["Row"];
type ClaimRow = Database["public"]["Views"]["donation_catalog_claims"]["Row"];

export function createCatalogRepository(client: ServerSupabaseClient): CatalogRepository {
  const publicUrlFor = (bucketId: string, storagePath: string): string =>
    client.storage.from(bucketId).getPublicUrl(storagePath).data.publicUrl;

  return {
    async listPublishedItems(campaignId: string): Promise<DonationItem[]> {
      const { data, error } = await client
        .from("donation_catalog")
        .select(CATALOG_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new Error(`leer el catálogo: ${error.message}`);
      }

      const photos = await loadPhotos(
        client,
        data.map((row) => row.photo_media_id),
        publicUrlFor,
      );

      return data.map((row) => toDonationItem(row, photos));
    },

    async findPublishedItem(
      campaignId: string,
      itemId: string,
    ): Promise<DonationItem | null> {
      const { data, error } = await client
        .from("donation_catalog")
        .select(CATALOG_COLUMNS)
        .eq("campaign_id", campaignId)
        .eq("id", itemId)
        .maybeSingle();

      if (error !== null) {
        throw new Error(`leer el ítem del catálogo: ${error.message}`);
      }

      if (data === null) {
        return null;
      }

      const photos = await loadPhotos(client, [data.photo_media_id], publicUrlFor);

      return toDonationItem(data, photos);
    },

    async listNamedClaims(): Promise<CatalogClaim[]> {
      const { data, error } = await client
        .from("donation_catalog_claims")
        .select(CLAIM_COLUMNS);

      if (error !== null) {
        throw new Error(`leer quién tomó del catálogo: ${error.message}`);
      }

      return data.flatMap((row) => {
        const claim = toClaim(row);

        return claim === null ? [] : [claim];
      });
    },
  };
}

export async function loadPhotos(
  client: ServerSupabaseClient,
  ids: readonly (string | null)[],
  publicUrlFor: (bucketId: string, storagePath: string) => string,
): Promise<Map<string, ReturnType<typeof mapMedia>>> {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))];

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from("media")
    .select(MEDIA_COLUMNS)
    .in("id", unique);

  if (error !== null) {
    throw new Error(`leer las fotos del catálogo: ${error.message}`);
  }

  const photos = new Map<string, ReturnType<typeof mapMedia>>();

  for (const row of data as MediaRow[]) {
    photos.set(row.id, mapMedia(row, publicUrlFor));
  }

  return photos;
}

function toDonationItem(
  row: CatalogRow,
  photos: Map<string, ReturnType<typeof mapMedia>>,
): DonationItem {
  if (
    row.id === null ||
    row.campaign_id === null ||
    row.title === null ||
    row.unit === null ||
    row.category === null ||
    row.needed_quantity === null ||
    row.remaining_quantity === null ||
    row.fulfilled_quantity === null ||
    row.sort_order === null
  ) {
    throw new MappingError("donation_catalog: una fila de la vista llegó incompleta.");
  }

  if (!isDonationUnit(row.unit)) {
    throw new MappingError(
      `donation_catalog.${row.id}: unidad desconocida "${String(row.unit)}".`,
    );
  }

  if (!isDonationItemCategory(row.category)) {
    throw new MappingError(
      `donation_catalog.${row.id}: categoría desconocida "${String(row.category)}".`,
    );
  }

  const quantities = {
    needed: row.needed_quantity,
    reserved: row.needed_quantity - row.remaining_quantity - row.fulfilled_quantity,
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
    remainingQuantity: remaining(quantities),
    fulfilledQuantity: row.fulfilled_quantity,
    estimatedValue: estimatedValueOf(row.estimated_unit_amount_minor, row.currency),
    photo: row.photo_media_id === null ? null : (photos.get(row.photo_media_id) ?? null),
    sortOrder: row.sort_order,
  };
}

function toClaim(row: ClaimRow): CatalogClaim | null {
  if (
    row.id === null ||
    row.item_id === null ||
    row.quantity === null ||
    row.donor_display_name === null
  ) {
    return null;
  }

  return {
    id: row.id,
    itemId: row.item_id,
    quantity: row.quantity,
    donorDisplayName: row.donor_display_name,
    fulfilledAt: row.fulfilled_at,
    hasPortrait: row.has_portrait === true,
  };
}
