import { EXPENSE_CATEGORY_LABELS } from "@/src/domain/entities";
import { formatPercentage } from "@/src/domain/percentage";

import { getTransparencyReport } from "../use-cases/get-transparency-report";
import { formatDate, noInput, unavailableOutcome } from "./capability-helpers";
import type { AgentCapability } from "./types";

export interface TransparencySummaryOutput {
  readonly spentPercent: number | null;
  readonly remainingPercent: number | null;
  readonly expenseCount: number;
  readonly receiptCount: number;
  readonly byCategory: readonly {
    readonly category: string;
    readonly percent: number | null;
  }[];
  readonly reconciledAt: string | null;
  readonly detailUrl: string;
}

export const getTransparencySummary: AgentCapability<
  Record<string, never>,
  TransparencySummaryOutput
> = {
  name: "get_transparency_summary",
  title: "Resumen de la rendición",
  description:
    "Devuelve qué parte de lo ya recibido se usó y cuál sigue, la cantidad de gastos y de comprobantes, el gasto por categoría como porcentaje de lo gastado, y la fecha de la última conciliación. No incluye montos, aportes individuales, identidades ni archivos de comprobantes. El 100% de la obra no está publicado.",
  input: noInput,
  readOnly: true,
  async run(_input, context) {
    const result = await getTransparencyReport({
      dataLayer: context.dataLayer,
      logger: context.logger,
    });

    if (result.status !== "ok") {
      return unavailableOutcome(result.reason);
    }

    const { summary } = result.data;

    return {
      ok: true,
      output: {
        spentPercent: summary.primary.executedPercent,
        remainingPercent: summary.primary.remainingPercent,
        expenseCount: summary.expenseCount,
        receiptCount: summary.receiptCount,
        byCategory: summary.byCategory.map((entry) => ({
          category: EXPENSE_CATEGORY_LABELS[entry.category],
          percent: entry.percentOfSpent,
        })),
        reconciledAt: summary.reconciledAt,
        detailUrl: `${context.siteUrl}/transparencia`,
      },
    };
  },
  format(output) {
    const reconciled =
      output.reconciledAt === null
        ? ""
        : ` Conciliado al ${formatDate(output.reconciledAt)}.`;

    if (output.spentPercent === null || output.remainingPercent === null) {
      return `Todavía no hay aportes conciliados para hablar de plata. El 100% de la obra no está publicado.${reconciled} Detalle en ${output.detailUrl}`;
    }

    const used = formatPercentage(output.spentPercent);
    const left = formatPercentage(output.remainingPercent);

    return `Se usó el ${used} de lo que ya llegó; el ${left} sigue en la cuenta, en ${String(output.expenseCount)} gastos. El 100% de la obra no está publicado.${reconciled} Detalle completo en ${output.detailUrl}`;
  },
};
