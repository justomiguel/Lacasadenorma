import { can } from "@/src/domain/permissions";
import { buildOwnerMetrics } from "@/src/domain/metrics-build";
import type { OwnerMetrics } from "@/src/domain/metrics";
import type { AnalyticsRead } from "@/src/domain/metrics-analytics";

import type { AdminDeps } from "./core";

export type OwnerMetricsResult =
  | { readonly status: "ok"; readonly data: OwnerMetrics }
  | { readonly status: "rejected"; readonly message: string }
  | {
      readonly status: "unavailable";
      readonly reason: "not-published" | "error";
    };

/**
 * El tablero del owner.
 *
 * Lee un snapshot sin datos personales y deja que el dominio agregue y señale.
 * No deja rastro: mirar cifras no es una mutación (ADR-048).
 */
export async function getOwnerMetrics(
  deps: AdminDeps & { now?: Date },
): Promise<OwnerMetricsResult> {
  const { actor, gateway, logger } = deps;

  if (actor === null || !can(actor.role, "metricas.leer")) {
    return { status: "rejected", message: "Tu rol no permite ver el tablero." };
  }

  try {
    const campaign = await gateway.campaign.getCampaign();

    if (campaign === null) {
      return { status: "unavailable", reason: "not-published" };
    }

    const facts = await gateway.metrics.readSnapshot(campaign.id);
    const analytics = await readReach(deps);

    return {
      status: "ok",
      data: buildOwnerMetrics(campaign, facts, deps.now, analytics),
    };
  } catch (error) {
    logger.error("No se pudo leer el tablero de métricas", { error });

    return { status: "unavailable", reason: "error" };
  }
}

async function readReach(deps: AdminDeps & { now?: Date }): Promise<AnalyticsRead> {
  if (deps.analyticsStats === undefined) {
    return { status: "absent" };
  }

  try {
    return await deps.analyticsStats.read();
  } catch (error) {
    deps.logger.error("No se pudo leer el alcance del proveedor", { error });

    return { status: "error" };
  }
}
