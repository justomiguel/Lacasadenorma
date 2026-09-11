import type { UpdateRecord } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * Novedades publicadas. Los borradores no tienen camino de lectura pública: el
 * puerto sólo expone métodos que filtran por `published_at` (amenaza I7).
 */

export interface UpdatesDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
  readonly limit?: number;
}

export async function listUpdates(
  deps: UpdatesDeps,
): Promise<DataResult<UpdateRecord[]>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return unavailable("not-published");
    }

    return ok(await dataLayer.updates.listPublishedUpdates(campaign.id, deps.limit));
  } catch (error) {
    logger.error("No se pudieron leer las novedades", { error });

    return unavailable("error");
  }
}

export async function findUpdate(
  deps: Omit<UpdatesDeps, "limit"> & { readonly slug: string },
): Promise<DataResult<UpdateRecord | null>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    return ok(await dataLayer.updates.findPublishedUpdateBySlug(deps.slug));
  } catch (error) {
    logger.error("No se pudo leer la novedad", { error, slug: deps.slug });

    return unavailable("error");
  }
}
