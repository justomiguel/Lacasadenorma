import { EXPENSE_CATEGORY_LABELS } from "@/src/domain/entities";
import { formatMoney, money, type CurrencyCode } from "@/src/domain/money";

import { getTransparencyReport } from "../use-cases/get-transparency-report";
import { formatDate, noInput, unavailableOutcome } from "./capability-helpers";
import type { AgentCapability } from "./types";

export interface TransparencySummaryOutput {
  readonly receivedMinor: number;
  readonly spentMinor: number;
  readonly balanceMinor: number;
  readonly currency: CurrencyCode;
  readonly executedPercent: number | null;
  readonly expenseCount: number;
  readonly receiptCount: number;
  readonly byCategory: readonly {
    readonly category: string;
    readonly amountMinor: number;
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
    "Devuelve el total recibido, el total gastado, el saldo, el porcentaje ejecutado, la cantidad de gastos y de comprobantes, el gasto por categoría y la fecha de la última conciliación. No incluye aportes individuales, identidades ni archivos de comprobantes.",
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
        receivedMinor: summary.primary.received.amountMinor,
        spentMinor: summary.primary.spent.amountMinor,
        balanceMinor: summary.primary.balance.amountMinor,
        currency: summary.primary.currency,
        executedPercent: summary.primary.executedPercent,
        expenseCount: summary.expenseCount,
        receiptCount: summary.receiptCount,
        byCategory: summary.byCategory.map((entry) => ({
          category: EXPENSE_CATEGORY_LABELS[entry.category],
          amountMinor: entry.amount.amountMinor,
        })),
        reconciledAt: summary.reconciledAt,
        detailUrl: `${context.siteUrl}/transparencia`,
      },
    };
  },
  format(output) {
    const received = formatMoney(money(output.receivedMinor, output.currency));
    const spent = formatMoney(money(output.spentMinor, output.currency));
    const balance = formatMoney(money(output.balanceMinor, output.currency));
    const reconciled =
      output.reconciledAt === null
        ? ""
        : ` Conciliado al ${formatDate(output.reconciledAt)}.`;

    return `Recibido ${received}, gastado ${spent}, saldo ${balance} en ${String(output.expenseCount)} gastos.${reconciled} Detalle completo en ${output.detailUrl}`;
  },
};
