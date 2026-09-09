import type { BudgetItem, Campaign } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";
import { summarizeFundraising, summarizeMilestones } from "@/src/domain/progress";
import type { FundraisingProgress, MilestoneProgress } from "@/src/domain/progress";
import { summarizeTransparency } from "@/src/domain/transparency";
import type { TransparencySummary } from "@/src/domain/transparency";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * Todo lo que la home necesita, en una sola lectura.
 *
 * Es un único caso de uso y no cinco porque la home tiene que responder las
 * nueve preguntas del proyecto sin que la persona abandone la página (FR-002), y
 * cinco lecturas independientes darían cinco oportunidades de mostrar una parte
 * y omitir otra sin motivo visible.
 */

export interface CampaignOverview {
  readonly campaign: Campaign;
  readonly fundraising: FundraisingProgress;
  readonly milestones: MilestoneProgress;
  readonly budgetItems: readonly BudgetItem[];
  readonly transparency: TransparencySummary;
}

export interface CampaignOverviewDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
  readonly now?: Date;
}

export async function getCampaignOverview(
  deps: CampaignOverviewDeps,
): Promise<DataResult<CampaignOverview>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return unavailable("not-published");
    }

    const [budgetItems, contributions, expenses, milestones] = await Promise.all([
      dataLayer.campaigns.listBudgetItems(campaign.id),
      dataLayer.transparency.listContributions(campaign.id),
      dataLayer.transparency.listPublishedExpenses(campaign.id),
      dataLayer.milestones.listPublishedMilestones(campaign.id),
    ]);

    const onOutOfRange = (value: number) => {
      // Un porcentaje fuera de rango no rompe la página, pero es un síntoma:
      // significa que se gastó más que el objetivo, o que el objetivo está mal
      // cargado. Se acota y se registra (principio XII).
      logger.warn("Porcentaje fuera de rango al calcular el avance", {
        campaignId: campaign.id,
        value,
      });
    };

    return ok({
      campaign,
      fundraising: summarizeFundraising({
        contributions,
        goal: campaign.goal,
        onOutOfRange,
      }),
      milestones: summarizeMilestones(milestones),
      budgetItems,
      transparency: summarizeTransparency({
        contributions,
        expenses,
        goal: campaign.goal,
        reconciledAt: campaign.reconciledAt,
        defaultCurrency: campaign.goalCurrency,
        ...(deps.now === undefined ? {} : { now: deps.now }),
        onOutOfRange,
      }),
    });
  } catch (error) {
    logger.error("No se pudo leer el estado de la campaña", { error });

    return unavailable("error");
  }
}
