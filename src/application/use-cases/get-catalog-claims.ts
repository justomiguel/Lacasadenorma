import type { CatalogClaim } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * Quién se anotó o ya trajo, con nombre.
 *
 * Lo anónimo no existe acá. Si la lectura falla, la tabla sigue pudiendo
 * mostrar cantidades: los nombres se omiten, no se inventan.
 */

export interface CatalogClaimsDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
}

export async function getCatalogClaims(
  deps: CatalogClaimsDeps,
): Promise<DataResult<CatalogClaim[]>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return unavailable("not-published");
    }

    return ok(await dataLayer.catalog.listNamedClaims());
  } catch (error) {
    logger.error("No se pudo leer quién tomó del catálogo", { error });

    return unavailable("error");
  }
}
