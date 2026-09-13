import type { BudgetItemAdminRecord, Campaign } from "@/src/domain/entities";
import type { AdminCampaignPort } from "@/src/domain/ports/admin";

import { mapBudgetItem, mapCampaign } from "../mappers";
import type { ServerSupabaseClient } from "../server-client";
import { BUDGET_ITEM_COLUMNS, CAMPAIGN_COLUMNS } from "./columns";
import { QueryError } from "./query";

export function createCampaignPort(client: ServerSupabaseClient): AdminCampaignPort {
  return {
    /**
     * Sin filtro de `published_at` ni de estado: el backoffice existe para
     * trabajar sobre lo que todavía no está publicado.
     */
    async getCampaign(): Promise<Campaign | null> {
      const { data, error } = await client
        .from("campaigns")
        .select(CAMPAIGN_COLUMNS)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error !== null) {
        throw new QueryError("leer la campaña", error);
      }

      return data === null ? null : mapCampaign(data);
    },

    async listBudgetItems(campaignId): Promise<BudgetItemAdminRecord[]> {
      const { data, error } = await client
        .from("budget_items")
        .select(BUDGET_ITEM_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new QueryError("leer los rubros", error);
      }

      return data.map((row) => ({
        ...mapBudgetItem(row),
        publishedAt: row.published_at,
      }));
    },

    async updateGoal({ campaignId, goal }): Promise<void> {
      const { error } = await client
        .from("campaigns")
        .update(
          goal === null
            ? { goal_amount_minor: null }
            : { goal_amount_minor: goal.amountMinor, goal_currency: goal.currency },
        )
        .eq("id", campaignId);

      if (error !== null) {
        throw new QueryError("actualizar el objetivo", error);
      }
    },

    async saveBudgetItem(input): Promise<string> {
      const row = {
        campaign_id: input.campaignId,
        title: input.title,
        description: input.description,
        estimated_amount_minor: input.estimatedAmount?.amountMinor ?? null,
        // La moneda se guarda siempre, incluso sin monto: es la moneda en la que
        // se va a cotizar el rubro, y dejarla nula obligaría a adivinarla después.
        currency: input.estimatedAmount?.currency ?? "ARS",
        sort_order: input.sortOrder,
        published_at: input.publish ? new Date().toISOString() : null,
      };

      const { data, error } =
        input.id === null
          ? await client.from("budget_items").insert(row).select("id").single()
          : await client
              .from("budget_items")
              .update(row)
              .eq("id", input.id)
              .select("id")
              .single();

      if (error !== null) {
        throw new QueryError("guardar el rubro", error);
      }

      return data.id;
    },
  };
}
