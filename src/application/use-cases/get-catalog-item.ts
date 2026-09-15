import type { DonationItem } from "@/src/domain/entities";

import { ok, unavailable, type DataResult } from "../result";

import type { CatalogDeps } from "./get-catalog";

/**
 * Un ítem publicado del catálogo, para su ficha.
 *
 * Un id que no existe o que no está publicado es `ok` con `null`: la página
 * responde 404, no una lista vacía. Sin base, no hay ficha que mostrar.
 */

export async function getCatalogItem(
  deps: CatalogDeps & { readonly itemId: string },
): Promise<DataResult<DonationItem | null>> {
  const { dataLayer, logger, itemId } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return unavailable("not-published");
    }

    return ok(await dataLayer.catalog.findPublishedItem(campaign.id, itemId));
  } catch (error) {
    logger.error("No se pudo leer el ítem del catálogo", { error, itemId });

    return unavailable("error");
  }
}
