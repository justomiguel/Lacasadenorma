import type { ContributionWallEntry } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * El muro de aportes en plata: quién aportó con nombre, y el % si la
 * campaña lo prende.
 *
 * Una lista vacía es un estado distinto de no poder leer: todavía nadie
 * aportó eligiendo aparecer, y la pantalla lo tiene que decir sin inventar
 * nombres. El monto no existe en este caso de uso (ADR-042).
 */

export interface ContributionWallDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
}

export async function getContributionWall(
  deps: ContributionWallDeps,
): Promise<DataResult<ContributionWallEntry[]>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return ok([]);
    }

    return ok(await dataLayer.wall.listMoneyEntries(campaign.id));
  } catch (error) {
    logger.error("No se pudo leer el muro de aportes", { error });

    return unavailable("error");
  }
}
