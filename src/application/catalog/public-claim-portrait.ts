import type { CatalogPortraitPort } from "@/src/domain/ports/catalog-portraits";
import type { Logger } from "@/src/domain/ports/logger";

import { ok, unavailable, type DataResult } from "../result";

/**
 * El archivo de una reserva publicada, para `/catalogo/retrato/[id]`.
 *
 * Sin puerto no hay foto que inventar. Sin fila (o sin archivo) es 404, no un
 * error: la vista anónima es la autorización y un id que no aparece ahí no
 * existe para el público. Si la bajada tira, queda en el log y la respuesta
 * sigue siendo "no hay foto".
 */

export interface PublicClaimPortrait {
  readonly bytes: ArrayBuffer;
  readonly mimeType: string;
}

export interface PublicClaimPortraitDeps {
  readonly port: CatalogPortraitPort | null;
  readonly logger: Logger;
}

export async function getPublicClaimPortrait(
  deps: PublicClaimPortraitDeps,
  claimId: string,
): Promise<DataResult<PublicClaimPortrait>> {
  const { port, logger } = deps;

  if (port === null) {
    return unavailable("not-configured");
  }

  try {
    const file = await port.readPublicClaimPortrait(claimId);

    if (file === null) {
      return unavailable("not-published");
    }

    return ok(file);
  } catch (error) {
    logger.error("No se pudo servir el retrato del catálogo", { error, claimId });

    return unavailable("error");
  }
}
