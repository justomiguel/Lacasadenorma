import type {
  BudgetItem,
  Campaign,
  ContributionAdminRecord,
  ExpenseAdminRecord,
  MediaAsset,
  MilestoneRecord,
  PaymentMethod,
  UpdateRecord,
} from "@/src/domain/entities";
import type { AdminGateway, AuditEntry } from "@/src/domain/ports/admin";

import {
  inspectImage,
  inspectReceipt,
  storageKeyFor,
  UnsupportedFileError,
} from "../files/image";
import {
  mapBudgetItem,
  mapCampaign,
  mapExpense,
  mapMedia,
  mapMilestone,
  mapPaymentMethod,
  type MediaRow,
} from "./mappers";
import type { ServerSupabaseClient } from "./server-client";

/**
 * Implementación del backoffice sobre Supabase.
 *
 * Corre con el cliente **con sesión**, así que cada consulta se evalúa con las
 * policies del rol de quien está mirando. Eso importa más de lo que parece: las
 * guardas de `guards.ts` deciden qué pantalla se muestra, pero lo que impide una
 * escritura no autorizada es que la policy la rechace. Si las dos discrepan, la que
 * gana es la de la base, y es la que tiene pruebas pgTAP.
 *
 * Ninguna operación de este archivo borra un registro financiero. Se anula, con
 * motivo y fecha. La forma del puerto ya lo impone; acá se cumple.
 */

class QueryError extends Error {
  constructor(operation: string, cause: { message: string; code?: string }) {
    super(
      `${operation}: ${cause.message}${cause.code === undefined ? "" : ` (${cause.code})`}`,
    );
    this.name = "QueryError";
  }
}

const CAMPAIGN_COLUMNS =
  "id, slug, title, summary, goal_amount_minor, goal_currency, status, reconciled_at";

const BUDGET_ITEM_COLUMNS =
  "id, title, description, estimated_amount_minor, currency, sort_order";

const CONTRIBUTION_COLUMNS =
  "id, amount_minor, currency, received_at, payment_method_id, source_note, is_anonymous, voided_at, void_reason, recorded_by";

const EXPENSE_ADMIN_COLUMNS =
  "id, amount_minor, currency, spent_at, concept, category, supplier, budget_item_id, receipt_count, voided_at, void_reason, published_at, recorded_by";

const MILESTONE_COLUMNS = "id, title, description, status, happened_on, sort_order";

const PAYMENT_METHOD_COLUMNS =
  "id, kind, country_code, currency, label, fields, instructions, sort_order";

const MEDIA_COLUMNS =
  "id, storage_path, alt_text, caption, credit, width, height, taken_on";

const UPDATE_COLUMNS = `id, slug, title, body, published_at, update_media(sort_order, media(${MEDIA_COLUMNS}))`;

const PHOTO_BUCKET = "fotos";
const RECEIPT_BUCKET = "comprobantes";

export function createAdminGateway(client: ServerSupabaseClient): AdminGateway {
  const publicUrlFor = (storagePath: string): string =>
    client.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data.publicUrl;

  interface UpdateRow {
    id: string;
    slug: string;
    title: string;
    body: string;
    published_at: string | null;
    update_media: { sort_order: number; media: MediaRow | null }[];
  }

  function mapUpdate(row: UpdateRow): UpdateRecord {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      body: row.body,
      publishedAt: row.published_at,
      media: [...row.update_media]
        .sort((a, b) => a.sort_order - b.sort_order)
        .flatMap((link) =>
          link.media === null ? [] : [mapMedia(link.media, publicUrlFor)],
        ),
    };
  }

  return {
    campaign: {
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

      async listBudgetItems(campaignId): Promise<BudgetItem[]> {
        const { data, error } = await client
          .from("budget_items")
          .select(BUDGET_ITEM_COLUMNS)
          .eq("campaign_id", campaignId)
          .order("sort_order", { ascending: true });

        if (error !== null) {
          throw new QueryError("leer los rubros", error);
        }

        return data.map(mapBudgetItem);
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
    },

    contributions: {
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
    },

    expenses: {
      async listExpenses(campaignId): Promise<ExpenseAdminRecord[]> {
        const { data, error } = await client
          .from("expenses")
          .select(EXPENSE_ADMIN_COLUMNS)
          .eq("campaign_id", campaignId)
          .order("spent_at", { ascending: false });

        if (error !== null) {
          throw new QueryError("leer los gastos", error);
        }

        return data.map((row) => ({
          ...mapExpense(row),
          voidReason: row.void_reason,
          publishedAt: row.published_at,
          recordedBy: row.recorded_by,
        }));
      },

      async recordExpense(input): Promise<string> {
        const { data, error } = await client
          .from("expenses")
          .insert({
            campaign_id: input.campaignId,
            budget_item_id: input.budgetItemId,
            amount_minor: input.amount.amountMinor,
            currency: input.amount.currency,
            spent_at: input.spentAt,
            concept: input.concept,
            category: input.category,
            supplier: input.supplier,
            published_at: input.publish ? new Date().toISOString() : null,
          })
          .select("id")
          .single();

        if (error !== null) {
          throw new QueryError("registrar el gasto", error);
        }

        return data.id;
      },

      async voidExpense({ id, reason }): Promise<void> {
        const { error } = await client
          .from("expenses")
          .update({ voided_at: new Date().toISOString(), void_reason: reason })
          .eq("id", id);

        if (error !== null) {
          throw new QueryError("anular el gasto", error);
        }
      },

      async attachReceipt(input): Promise<void> {
        const { error } = await client.from("expense_receipts").insert({
          expense_id: input.expenseId,
          storage_path: input.storagePath,
          file_name: input.fileName,
          mime_type: input.mimeType,
          size_bytes: input.sizeBytes,
        });

        if (error !== null) {
          throw new QueryError("registrar el comprobante", error);
        }
      },

      /**
       * URL firmada y de vida corta. El bucket de comprobantes **nunca** es público:
       * una factura suele traer el nombre y el domicilio de un proveedor, y publicar
       * eso sería filtrar datos de un tercero que no eligió aparecer (amenaza I1).
       */
      async createReceiptLink({ storagePath, expiresInSeconds }): Promise<string> {
        const { data, error } = await client.storage
          .from(RECEIPT_BUCKET)
          .createSignedUrl(storagePath, expiresInSeconds);

        if (error !== null) {
          throw new QueryError("firmar el comprobante", error);
        }

        return data.signedUrl;
      },
    },

    updates: {
      async listUpdates(campaignId): Promise<UpdateRecord[]> {
        const { data, error } = await client
          .from("updates")
          .select(UPDATE_COLUMNS)
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false });

        if (error !== null) {
          throw new QueryError("leer las novedades", error);
        }

        return data.map(mapUpdate);
      },

      async findUpdate(id): Promise<UpdateRecord | null> {
        const { data, error } = await client
          .from("updates")
          .select(UPDATE_COLUMNS)
          .eq("id", id)
          .maybeSingle();

        if (error !== null) {
          throw new QueryError("leer la novedad", error);
        }

        return data === null ? null : mapUpdate(data);
      },

      async saveUpdate(input): Promise<string> {
        const row = {
          campaign_id: input.campaignId,
          slug: input.slug,
          title: input.title,
          body: input.body,
        };

        const { data, error } =
          input.id === null
            ? await client.from("updates").insert(row).select("id").single()
            : await client
                .from("updates")
                .update(row)
                .eq("id", input.id)
                .select("id")
                .single();

        if (error !== null) {
          throw new QueryError("guardar la novedad", error);
        }

        return data.id;
      },

      async setUpdatePublished({ id, publishedAt }): Promise<void> {
        const { error } = await client
          .from("updates")
          .update({ published_at: publishedAt })
          .eq("id", id);

        if (error !== null) {
          throw new QueryError("publicar la novedad", error);
        }
      },

      /**
       * El orden importa: primero se valida el archivo por contenido, después se
       * sube, y sólo entonces se crea la fila. Si la fila se creara primero, un
       * fallo de subida dejaría una foto registrada que no existe, y la galería
       * mostraría un hueco roto.
       */
      async createMedia(input): Promise<MediaAsset> {
        const info = await inspectImage(input.file);
        const key = storageKeyFor(info.mimeType);

        const { error: uploadError } = await client.storage
          .from(PHOTO_BUCKET)
          .upload(key, input.file, {
            contentType: info.mimeType,
            // Sin `upsert`: la clave la genera el servidor y es única, así que un
            // upsert sólo podría pisar el archivo de otra persona.
            upsert: false,
          });

        if (uploadError !== null) {
          throw new UnsupportedFileError(
            `No pudimos subir la foto: ${uploadError.message}`,
          );
        }

        const { data, error } = await client
          .from("media")
          .insert({
            storage_path: key,
            alt_text: input.alt,
            caption: input.caption,
            credit: input.credit,
            width: info.width,
            height: info.height,
            taken_on: input.takenOn,
          })
          .select(MEDIA_COLUMNS)
          .single();

        if (error !== null) {
          throw new QueryError("registrar la foto", error);
        }

        return mapMedia(data, publicUrlFor);
      },

      async attachMediaToUpdate({ updateId, mediaId, sortOrder }): Promise<void> {
        const { error } = await client
          .from("update_media")
          .upsert(
            { update_id: updateId, media_id: mediaId, sort_order: sortOrder },
            { onConflict: "update_id,media_id" },
          );

        if (error !== null) {
          throw new QueryError("asociar la foto a la novedad", error);
        }
      },
    },

    milestones: {
      async listMilestones(campaignId): Promise<MilestoneRecord[]> {
        const { data, error } = await client
          .from("milestones")
          .select(MILESTONE_COLUMNS)
          .eq("campaign_id", campaignId)
          .order("sort_order", { ascending: true });

        if (error !== null) {
          throw new QueryError("leer los hitos", error);
        }

        return data.map(mapMilestone);
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
    },

    paymentMethods: {
      async listMethods(campaignId): Promise<PaymentMethod[]> {
        const { data, error } = await client
          .from("payment_methods")
          .select(PAYMENT_METHOD_COLUMNS)
          .eq("campaign_id", campaignId)
          .order("sort_order", { ascending: true });

        if (error !== null) {
          throw new QueryError("leer las cuentas", error);
        }

        return data.map(mapPaymentMethod);
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
    },

    audit: {
      async append(input): Promise<void> {
        const { error } = await client.from("audit_log").insert({
          action: input.action,
          entity_table: input.entityTable,
          entity_id: input.entityId,
          diff: input.diff,
          // `actor_id` lo pone el default de la tabla desde `auth.uid()`: si lo
          // mandara el cliente, sería un dato que quien llama elige, y el registro
          // de auditoría dejaría de servir para lo único que sirve.
        });

        if (error !== null) {
          throw new QueryError("registrar en la auditoría", error);
        }
      },

      async list(limit): Promise<AuditEntry[]> {
        const { data, error } = await client
          .from("audit_log")
          .select("id, actor_id, action, entity_table, entity_id, diff, occurred_at")
          .order("occurred_at", { ascending: false })
          .limit(limit);

        if (error !== null) {
          throw new QueryError("leer la auditoría", error);
        }

        return data.map((row) => ({
          id: String(row.id),
          actorId: row.actor_id,
          action: row.action,
          entityTable: row.entity_table,
          entityId: row.entity_id,
          diff:
            typeof row.diff === "object" && row.diff !== null && !Array.isArray(row.diff)
              ? (row.diff as Record<string, unknown>)
              : null,
          occurredAt: row.occurred_at,
        }));
      },
    },
  };
}

/** Raíz de composición del backoffice. Devuelve `null` sin Supabase configurado. */
export async function getAdminGateway(): Promise<AdminGateway | null> {
  const { createServerSupabaseClient } = await import("./server-client");
  const client = await createServerSupabaseClient();

  return client === null ? null : createAdminGateway(client);
}
