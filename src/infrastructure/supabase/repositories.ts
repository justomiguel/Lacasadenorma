import type {
  BudgetItem,
  Campaign,
  ContributionRecord,
  ExpenseRecord,
  MediaAsset,
  MilestoneRecord,
  PaymentMethod,
  UpdateRecord,
} from "@/src/domain/entities";
import type {
  CampaignRepository,
  MilestoneRepository,
  PaymentMethodRepository,
  TransparencyRepository,
  UpdateRepository,
} from "@/src/domain/ports/repositories";

import {
  mapBudgetItem,
  mapCampaign,
  mapContribution,
  mapExpense,
  mapMedia,
  mapMilestone,
  mapPaymentMethod,
  type MediaRow,
} from "./mappers";
import type { ServerSupabaseClient } from "./server-client";

/**
 * Repositorios sobre Supabase. Implementan los puertos de `src/domain/ports`, así
 * que la capa de aplicación no sabe que existe una base de datos (ADR-005).
 *
 * Tres reglas se repiten en todos y ninguna es redundante:
 *
 * 1. **El filtro de publicación se escribe igual acá que en la policy.** RLS ya lo
 *    impone para `anon`, pero estas mismas consultas corren también con la sesión
 *    de una persona del backoffice, que sí ve borradores. Sin el filtro explícito,
 *    la página pública mostraría un borrador a quien tiene sesión de editor, y el
 *    error sería invisible para todos los demás.
 * 2. **Ningún `select('*')`.** Se enumeran las columnas. Una columna nueva y
 *    sensible —una nota de conciliación, el nombre de quien aportó— no puede
 *    aparecer en una respuesta pública por el solo hecho de existir.
 * 3. **Un error de Postgres se lanza.** Los casos de uso lo atrapan y devuelven
 *    `unavailable("error")`. Devolver un array vacío ante un fallo sería mostrar
 *    "no hay gastos" cuando la verdad es "no pudimos leer" (principio XII).
 */

class QueryError extends Error {
  constructor(operation: string, cause: { message: string; code?: string }) {
    super(`${operation}: ${cause.message}${cause.code === undefined ? "" : ` (${cause.code})`}`);
    this.name = "QueryError";
  }
}

const CAMPAIGN_COLUMNS =
  "id, slug, title, summary, goal_amount_minor, goal_currency, status, reconciled_at";

const BUDGET_ITEM_COLUMNS =
  "id, title, description, estimated_amount_minor, currency, sort_order";

const CONTRIBUTION_COLUMNS = "id, amount_minor, currency, received_at, voided_at";

const EXPENSE_COLUMNS =
  "id, amount_minor, currency, spent_at, concept, category, supplier, budget_item_id, receipt_count, voided_at";

const MILESTONE_COLUMNS =
  "id, title, description, status, happened_on, sort_order";

const PAYMENT_METHOD_COLUMNS =
  "id, kind, country_code, currency, label, fields, instructions, sort_order";

const MEDIA_COLUMNS =
  "id, storage_path, alt_text, caption, credit, width, height, taken_on";

/** Bucket público de fotos. El de comprobantes nunca se resuelve a URL pública. */
const PHOTO_BUCKET = "fotos";

export function createSupabaseRepositories(client: ServerSupabaseClient): {
  campaigns: CampaignRepository;
  transparency: TransparencyRepository;
  milestones: MilestoneRepository;
  paymentMethods: PaymentMethodRepository;
  updates: UpdateRepository;
} {
  const publicUrlFor = (storagePath: string): string =>
    client.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data.publicUrl;

  const campaigns: CampaignRepository = {
    async getActiveCampaign(): Promise<Campaign | null> {
      // `maybeSingle` y no `single`: cero campañas publicadas es un estado
      // legítimo del sistema, no un error de consulta.
      const { data, error } = await client
        .from("campaigns")
        .select(CAMPAIGN_COLUMNS)
        .eq("status", "active")
        .not("published_at", "is", null)
        .order("published_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error !== null) {
        throw new QueryError("leer la campaña activa", error);
      }

      return data === null ? null : mapCampaign(data);
    },

    async listBudgetItems(campaignId: string): Promise<BudgetItem[]> {
      const { data, error } = await client
        .from("budget_items")
        .select(BUDGET_ITEM_COLUMNS)
        .eq("campaign_id", campaignId)
        .not("published_at", "is", null)
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new QueryError("leer los rubros del presupuesto", error);
      }

      return data.map(mapBudgetItem);
    },
  };

  const transparency: TransparencyRepository = {
    /**
     * Los aportes anulados **se traen**: el dominio los necesita para excluirlos de
     * los totales y para saber que existieron. Filtrarlos acá haría imposible
     * distinguir "no hubo aportes" de "los que hubo se anularon".
     */
    async listContributions(campaignId: string): Promise<ContributionRecord[]> {
      const { data, error } = await client
        .from("contributions")
        .select(CONTRIBUTION_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("received_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer los aportes", error);
      }

      return data.map(mapContribution);
    },

    async listPublishedExpenses(campaignId: string): Promise<ExpenseRecord[]> {
      const { data, error } = await client
        .from("expenses")
        .select(EXPENSE_COLUMNS)
        .eq("campaign_id", campaignId)
        .not("published_at", "is", null)
        .is("voided_at", null)
        .order("spent_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer los gastos publicados", error);
      }

      return data.map(mapExpense);
    },
  };

  const milestones: MilestoneRepository = {
    async listPublishedMilestones(campaignId: string): Promise<MilestoneRecord[]> {
      const { data, error } = await client
        .from("milestones")
        .select(MILESTONE_COLUMNS)
        .eq("campaign_id", campaignId)
        .not("published_at", "is", null)
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new QueryError("leer los hitos", error);
      }

      return data.map(mapMilestone);
    },
  };

  const paymentMethods: PaymentMethodRepository = {
    async listPublishedMethods(campaignId: string): Promise<PaymentMethod[]> {
      const { data, error } = await client
        .from("payment_methods")
        .select(PAYMENT_METHOD_COLUMNS)
        .eq("campaign_id", campaignId)
        .not("published_at", "is", null)
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new QueryError("leer los métodos de aporte", error);
      }

      return data.map(mapPaymentMethod);
    },
  };

  /**
   * Las fotos de una novedad llegan en la misma consulta, con el embed de
   * PostgREST. Dos consultas serían dos oportunidades de que la novedad exista y
   * las fotos no.
   */
  const UPDATE_COLUMNS = `id, slug, title, body, published_at, update_media(sort_order, media(${MEDIA_COLUMNS}))`;

  interface UpdateRow {
    id: string;
    slug: string;
    title: string;
    body: string;
    published_at: string | null;
    update_media: { sort_order: number; media: MediaRow | null }[];
  }

  function mapUpdate(row: UpdateRow): UpdateRecord {
    const media: MediaAsset[] = [...row.update_media]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((link) => (link.media === null ? [] : [mapMedia(link.media, publicUrlFor)]));

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      body: row.body,
      publishedAt: row.published_at,
      media,
    };
  }

  const updates: UpdateRepository = {
    async listPublishedUpdates(campaignId: string, limit?: number): Promise<UpdateRecord[]> {
      let query = client
        .from("updates")
        .select(UPDATE_COLUMNS)
        .eq("campaign_id", campaignId)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error !== null) {
        throw new QueryError("leer las novedades", error);
      }

      return data.map(mapUpdate);
    },

    async findPublishedUpdateBySlug(slug: string): Promise<UpdateRecord | null> {
      const { data, error } = await client
        .from("updates")
        .select(UPDATE_COLUMNS)
        .eq("slug", slug)
        .not("published_at", "is", null)
        .maybeSingle();

      if (error !== null) {
        throw new QueryError("leer la novedad", error);
      }

      return data === null ? null : mapUpdate(data);
    },
  };

  return { campaigns, transparency, milestones, paymentMethods, updates };
}
