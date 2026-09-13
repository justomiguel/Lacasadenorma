import type { DonationItem } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * El catálogo público: qué le falta a la casa.
 *
 * Sin campaña publicada o sin base, no hay lista que mostrar. Una lista vacía
 * es un estado distinto —todavía no hay ítems cargados— y llega como `ok` con
 * array vacío, para que la pantalla pueda decirlo sin confundirlo con un fallo.
 */

export interface CatalogDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
}

export async function getCatalog(deps: CatalogDeps): Promise<DataResult<DonationItem[]>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return unavailable("not-published");
    }

    return ok(await dataLayer.catalog.listPublishedItems(campaign.id));
  } catch (error) {
    logger.error("No se pudo leer el catálogo", { error });

    return unavailable("error");
  }
}
