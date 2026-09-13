import type { PaymentMethodAdminRecord } from "@/src/domain/entities";
import type { AdminPaymentMethodPort } from "@/src/domain/ports/admin";

import { mapPaymentMethod } from "../mappers";
import type { ServerSupabaseClient } from "../server-client";
import { PAYMENT_METHOD_COLUMNS } from "./columns";
import { QueryError } from "./query";

export function createPaymentMethodsPort(
  client: ServerSupabaseClient,
): AdminPaymentMethodPort {
  return {
    async listMethods(campaignId): Promise<PaymentMethodAdminRecord[]> {
      const { data, error } = await client
        .from("payment_methods")
        .select(PAYMENT_METHOD_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new QueryError("leer las cuentas", error);
      }

      return data.map((row) => ({
        ...mapPaymentMethod(row),
        publishedAt: row.published_at,
      }));
    },

    async saveMethod(input): Promise<string> {
      const row = {
        campaign_id: input.campaignId,
        kind: "bank_transfer" as const,
        country_code: input.countryCode,
        currency: input.currency,
        label: input.label,
        fields: input.fields.map((field) => ({
          label: field.label,
          value: field.value,
          copyable: field.copyable,
          hint: field.hint,
        })),
        instructions: input.instructions,
        sort_order: input.sortOrder,
      };

      const { data, error } =
        input.id === null
          ? await client.from("payment_methods").insert(row).select("id").single()
          : await client
              .from("payment_methods")
              .update(row)
              .eq("id", input.id)
              .select("id")
              .single();

      if (error !== null) {
        throw new QueryError("guardar la cuenta", error);
      }

      return data.id;
    },

    async setMethodPublished({ id, publishedAt }): Promise<void> {
      const { error } = await client
        .from("payment_methods")
        .update({ published_at: publishedAt })
        .eq("id", id);

      if (error !== null) {
        throw new QueryError("publicar la cuenta", error);
      }
    },
  };
}
