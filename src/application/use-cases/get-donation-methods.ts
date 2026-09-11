import type { CountryCode, PaymentMethod } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * Métodos de aporte publicados.
 *
 * Una lista vacía **no** es un error: significa que todavía no se verificó
 * ninguna cuenta. Es la diferencia que sostiene FR-007, y por eso el resultado
 * distingue tres estados: hay métodos, no hay ninguno publicado, y no se pudo
 * leer. Mostrar una cuenta sin verificar sería el peor fallo posible del sitio
 * (modelo de amenazas, T1).
 */

export interface DonationMethods {
  readonly methods: readonly PaymentMethod[];
  readonly countries: readonly CountryCode[];
}

export interface DonationMethodsDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
  readonly country?: CountryCode;
}

export async function getDonationMethods(
  deps: DonationMethodsDeps,
): Promise<DataResult<DonationMethods>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return unavailable("not-published");
    }

    const published = await dataLayer.paymentMethods.listPublishedMethods(campaign.id);
    const filtered =
      deps.country === undefined
        ? published
        : published.filter((method) => method.countryCode === deps.country);

    return ok({
      methods: [...filtered].sort((a, b) => a.sortOrder - b.sortOrder),
      countries: [...new Set(published.map((method) => method.countryCode))],
    });
  } catch (error) {
    logger.error("No se pudieron leer los métodos de aporte", { error });

    return unavailable("error");
  }
}
