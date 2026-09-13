import type { DonationWallEntry } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * El muro público: quién ayudó, con nombre, cuando el material ya llegó.
 *
 * Una lista vacía es un estado distinto de no poder leer: todavía nadie donó
 * en especie eligiendo aparecer, y la pantalla lo tiene que decir sin
 * inventar nombres (US3 escenario 5).
 */

export interface DonationWallDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
}

export async function getDonationWall(
  deps: DonationWallDeps,
): Promise<DataResult<DonationWallEntry[]>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    return ok(await dataLayer.wall.listEntries());
  } catch (error) {
    logger.error("No se pudo leer el muro de donantes", { error });

    return unavailable("error");
  }
}
