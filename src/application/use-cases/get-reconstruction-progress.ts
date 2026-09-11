import type { BudgetItem } from "@/src/domain/entities";
import type { Logger } from "@/src/domain/ports/logger";
import { summarizeMilestones, type MilestoneProgress } from "@/src/domain/progress";

import type { DataLayer } from "../data-layer";
import { ok, unavailable, type DataResult } from "../result";

/**
 * Avance de la obra: hitos y rubros de presupuesto.
 *
 * El porcentaje de avance se calcula sobre hitos completados, **no** sobre
 * dinero. Son dos medidas distintas y presentarlas como una sola sería engañoso:
 * un 60% de la plata no es un 60% de la casa.
 */

export interface ReconstructionProgress {
  readonly milestones: MilestoneProgress;
  readonly budgetItems: readonly BudgetItem[];
}

export interface ReconstructionProgressDeps {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
}

export async function getReconstructionProgress(
  deps: ReconstructionProgressDeps,
): Promise<DataResult<ReconstructionProgress>> {
  const { dataLayer, logger } = deps;

  if (dataLayer.source === "content-only") {
    return unavailable("not-configured");
  }

  try {
    const campaign = await dataLayer.campaigns.getActiveCampaign();

    if (campaign === null) {
      return unavailable("not-published");
    }

    const [milestones, budgetItems] = await Promise.all([
      dataLayer.milestones.listPublishedMilestones(campaign.id),
      dataLayer.campaigns.listBudgetItems(campaign.id),
    ]);

    return ok({ milestones: summarizeMilestones(milestones), budgetItems });
  } catch (error) {
    logger.error("No se pudo leer el avance de la reconstrucción", { error });

    return unavailable("error");
  }
}
