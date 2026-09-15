import { quotedBudgetShares } from "@/src/domain/shares";

import { getReconstructionProgress } from "../use-cases/get-reconstruction-progress";
import { noInput, unavailableOutcome } from "./capability-helpers";
import type { AgentCapability } from "./types";

export interface ReconstructionProgressOutput {
  readonly milestones: readonly {
    readonly title: string;
    readonly status: string;
    readonly happenedOn: string | null;
  }[];
  readonly completedCount: number;
  readonly totalCount: number;
  readonly percentComplete: number | null;
  readonly budgetItems: readonly {
    readonly title: string;
    readonly percentOfQuoted: number | null;
  }[];
}

export const getReconstructionProgressCapability: AgentCapability<
  Record<string, never>,
  ReconstructionProgressOutput
> = {
  name: "get_reconstruction_progress",
  title: "Avance de la obra",
  description:
    "Devuelve los hitos publicados de la reconstrucción con su estado y su fecha, la cantidad de hitos completados sobre el total, y los rubros del presupuesto como porcentaje de lo ya cotizado. El porcentaje de obra se calcula sobre hitos, no sobre dinero. El 100% de la obra no está publicado.",
  input: noInput,
  readOnly: true,
  async run(_input, context) {
    const result = await getReconstructionProgress({
      dataLayer: context.dataLayer,
      logger: context.logger,
    });

    if (result.status !== "ok") {
      return unavailableOutcome(result.reason);
    }

    const { milestones, budgetItems } = result.data;

    return {
      ok: true,
      output: {
        milestones: milestones.milestones.map((item) => ({
          title: item.title,
          status: item.status,
          happenedOn: item.happenedOn,
        })),
        completedCount: milestones.completedCount,
        totalCount: milestones.totalCount,
        percentComplete: milestones.percentComplete,
        budgetItems: quotedBudgetShares(budgetItems).map((share, index) => ({
          title: budgetItems[index]?.title ?? "",
          percentOfQuoted: share.percentOfQuoted,
        })),
      },
    };
  },
  format(output) {
    if (output.totalCount === 0) {
      return "Todavía no hay hitos de obra publicados.";
    }

    const done = `${String(output.completedCount)} de ${String(output.totalCount)} hitos completados`;
    const pending = output.milestones
      .filter((item) => item.status !== "completado")
      .map((item) => item.title)
      .join(", ");

    return pending.length === 0
      ? `${done}.`
      : `${done}. Pendientes o en curso: ${pending}.`;
  },
};
