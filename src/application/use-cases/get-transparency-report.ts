import type { BudgetItem, Campaign } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";
import { summarizeTransparency, type TransparencySummary } from "@/src/domain/transparency";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * La rendición de cuentas completa.
 *
 * Devuelve el mismo array de gastos que sustenta los totales, no una consulta
 * aparte: dos consultas pueden divergir y SC-007 exige que la suma del detalle
 * publicado sea exactamente el total publicado.
 */

export interface TransparencyReport {
  readonly campaign: Campaign;
  readonly summary: TransparencySummary;
  readonly budgetItems: readonly BudgetItem[];
}

export interface TransparencyReportDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
  readonly now?: Date;
}

export async function getTransparencyReport(
  deps: TransparencyReportDeps,
): Promise<DataResult<TransparencyReport>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return unavailable("not-published");
    }

    const [contributions, expenses, budgetItems] = await Promise.all([
      dataLayer.transparency.listContributions(campaign.id),
      dataLayer.transparency.listPublishedExpenses(campaign.id),
      dataLayer.campaigns.listBudgetItems(campaign.id),
    ]);

    return ok({
      campaign,
      budgetItems,
      summary: summarizeTransparency({
        contributions,
        expenses,
        goal: campaign.goal,
        reconciledAt: campaign.reconciledAt,
        defaultCurrency: campaign.goalCurrency,
        ...(deps.now === undefined ? {} : { now: deps.now }),
        onOutOfRange: (value) => {
          logger.warn("Porcentaje ejecutado fuera de rango", {
            campaignId: campaign.id,
            value,
          });
        },
      }),
    });
  } catch (error) {
    logger.error("No se pudo leer la rendición de cuentas", { error });

    return unavailable("error");
  }
}
