import { formatPercentage } from "@/src/domain/percentage";

import { getCampaignOverview } from "../use-cases/get-campaign-overview";
import { formatDate, noInput, unavailableOutcome } from "./capability-helpers";
import type { AgentCapability } from "./types";

export interface CampaignStatusOutput {
  readonly spentPercent: number | null;
  readonly remainingPercent: number | null;
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
    "Devuelve qué parte de lo ya recibido se usó y cuál sigue en la cuenta, y la fecha de la última conciliación. Los porcentajes son nulos cuando no hay recibido conciliado. El 100% de la obra no está publicado: no hay un porcentaje contra una meta.",
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

    const { campaign, transparency } = result.data;

    return {
      ok: true,
      output: {
        spentPercent: transparency.primary.executedPercent,
        remainingPercent: transparency.primary.remainingPercent,
        reconciledAt: campaign.reconciledAt,
        updatedAt: new Date().toISOString(),
      },
    };
  },
  format(output) {
    const reconciled =
      output.reconciledAt === null
        ? "Todavía no hubo una conciliación bancaria."
        : `Cifras conciliadas al ${formatDate(output.reconciledAt)}.`;

    if (output.spentPercent === null || output.remainingPercent === null) {
      return `Todavía no hay aportes conciliados. El 100% de la obra no está publicado. ${reconciled}`;
    }

    const used = formatPercentage(output.spentPercent);
    const left = formatPercentage(output.remainingPercent);

    return `De lo que ya llegó se usó el ${used}. El ${left} sigue en la cuenta. El 100% de la obra no está publicado. ${reconciled}`;
  },
};
