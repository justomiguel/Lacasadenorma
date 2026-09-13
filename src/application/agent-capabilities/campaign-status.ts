import { formatMoney, money, type CurrencyCode } from "@/src/domain/money";
import { formatPercentage } from "@/src/domain/percentage";

import { getCampaignOverview } from "../use-cases/get-campaign-overview";
import { formatDate, noInput, unavailableOutcome } from "./capability-helpers";
import type { AgentCapability } from "./types";

export interface CampaignStatusOutput {
  readonly goalMinor: number | null;
  readonly raisedMinor: number;
  readonly percent: number | null;
  readonly currency: CurrencyCode;
  readonly reconciledAt: string | null;
  readonly updatedAt: string;
}

export const getCampaignStatus: AgentCapability<
  Record<string, never>,
  CampaignStatusOutput
> = {
  name: "get_campaign_status",
  title: "Estado de la recaudación",
  description:
    "Devuelve el objetivo, el monto recaudado, el porcentaje alcanzado, la moneda y la fecha de la última conciliación bancaria de la campaña de reconstrucción de La Casa de Norma. El porcentaje es nulo cuando el objetivo no está publicado.",
  input: noInput,
  readOnly: true,
  async run(_input, context) {
    const result = await getCampaignOverview({
      dataLayer: context.dataLayer,
      logger: context.logger,
    });

    if (result.status !== "ok") {
      return unavailableOutcome(result.reason);
    }

    const { campaign, fundraising } = result.data;

    return {
      ok: true,
      output: {
        goalMinor: campaign.goal?.amountMinor ?? null,
        raisedMinor: fundraising.raised.amountMinor,
        percent: fundraising.percent,
        currency: fundraising.raised.currency,
        reconciledAt: campaign.reconciledAt,
        updatedAt: new Date().toISOString(),
      },
    };
  },
  format(output) {
    const raised = formatMoney(money(output.raisedMinor, output.currency));
    const reconciled =
      output.reconciledAt === null
        ? "Todavía no hubo una conciliación bancaria."
        : `Cifras conciliadas al ${formatDate(output.reconciledAt)}.`;

    if (output.goalMinor === null || output.percent === null) {
      return `Se recaudaron ${raised}. El objetivo todavía no está publicado. ${reconciled}`;
    }

    const goal = formatMoney(money(output.goalMinor, output.currency));

    return `Se recaudaron ${raised} de un objetivo de ${goal} (${formatPercentage(output.percent)}). ${reconciled}`;
  },
};
