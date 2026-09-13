import type { ContributionAdminRecord } from "@/src/domain/entities";
import type { AdminContributionPort } from "@/src/domain/ports/admin";

import type { ServerSupabaseClient } from "../server-client";
import { CONTRIBUTION_COLUMNS } from "./columns";
import { QueryError } from "./query";

export function createContributionsPort(
  client: ServerSupabaseClient,
): AdminContributionPort {
  return {
    async listContributions(campaignId): Promise<ContributionAdminRecord[]> {
      const { data, error } = await client
        .from("contributions")
        .select(CONTRIBUTION_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("received_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer los aportes", error);
      }

      return data.map((row) => ({
        id: row.id,
        amount: {
          amountMinor: row.amount_minor,
          currency: row.currency.trim(),
        } as ContributionAdminRecord["amount"],
        receivedAt: row.received_at,
        voidedAt: row.voided_at,
        paymentMethodId: row.payment_method_id,
        sourceNote: row.source_note,
        isAnonymous: row.is_anonymous,
        voidReason: row.void_reason,
        recordedBy: row.recorded_by,
      }));
    },

    async recordContribution(input): Promise<string> {
      const { data, error } = await client
        .from("contributions")
        .insert({
          campaign_id: input.campaignId,
          amount_minor: input.amount.amountMinor,
          currency: input.amount.currency,
          received_at: input.receivedAt,
          payment_method_id: input.paymentMethodId,
          source_note: input.sourceNote,
        })
        .select("id")
        .single();

      if (error !== null) {
        throw new QueryError("registrar el aporte", error);
      }

      return data.id;
    },

    /**
     * Anular, no borrar. La restricción `contributions_void_has_reason` de la base
     * exige que la fecha y el motivo viajen juntos, así que una anulación sin
     * motivo no es posible ni desde acá ni desde ninguna otra parte.
     */
    async voidContribution({ id, reason }): Promise<void> {
      const { error } = await client
        .from("contributions")
        .update({ voided_at: new Date().toISOString(), void_reason: reason })
        .eq("id", id);

      if (error !== null) {
        throw new QueryError("anular el aporte", error);
      }
    },

    async markReconciled({ campaignId, reconciledAt }): Promise<void> {
      const { error } = await client
        .from("campaigns")
        .update({ reconciled_at: reconciledAt })
        .eq("id", campaignId);

      if (error !== null) {
        throw new QueryError("marcar la conciliación", error);
      }
    },
  };
}
