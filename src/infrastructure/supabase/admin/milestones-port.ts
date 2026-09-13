import type { MilestoneAdminRecord } from "@/src/domain/entities";
import type { AdminMilestonePort } from "@/src/domain/ports/admin";

import { mapMilestone } from "../mappers";
import type { ServerSupabaseClient } from "../server-client";
import { MILESTONE_COLUMNS } from "./columns";
import { QueryError } from "./query";

export function createMilestonesPort(client: ServerSupabaseClient): AdminMilestonePort {
  return {
    async listMilestones(campaignId): Promise<MilestoneAdminRecord[]> {
      const { data, error } = await client
        .from("milestones")
        .select(MILESTONE_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new QueryError("leer los hitos", error);
      }

      return data.map((row) => ({
        ...mapMilestone(row),
        publishedAt: row.published_at,
      }));
    },

    async saveMilestone(input): Promise<string> {
      const row = {
        campaign_id: input.campaignId,
        title: input.title,
        description: input.description,
        status: input.status,
        happened_on: input.happenedOn,
        sort_order: input.sortOrder,
        published_at: input.publish ? new Date().toISOString() : null,
      };

      const { data, error } =
        input.id === null
          ? await client.from("milestones").insert(row).select("id").single()
          : await client
              .from("milestones")
              .update(row)
              .eq("id", input.id)
              .select("id")
              .single();

      if (error !== null) {
        throw new QueryError("guardar el hito", error);
      }

      return data.id;
    },
  };
}
