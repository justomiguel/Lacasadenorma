import type {
  BudgetItem,
  Campaign,
  ExpenseRecord,
  MilestoneRecord,
  PaymentMethod,
  PersonRecord,
  UpdateRecord,
} from "../entities";
import type { Money } from "../money";

/**
 * Puertos de lectura pública. Dos implementaciones los satisfacen: una sobre el
 * contenido versionado en `content/`, que funciona sin credenciales, y una sobre
 * Supabase. La capa de aplicación no sabe cuál está usando (ADR-005, FR-034).
 *
 * Todos los métodos devuelven **sólo material publicado**. Los borradores no
 * tienen camino de lectura pública, ni por descuido: la forma de estos puertos
 * no permite pedirlos.
 */

export interface CampaignRepository {
  getActiveCampaign(): Promise<Campaign | null>;
  listBudgetItems(campaignId: string): Promise<BudgetItem[]>;
}

export interface TransparencyRepository {
  /**
   * Total recibido por moneda, ya agregado.
   *
   * **No** existe un método que devuelva el detalle de aportes, y su ausencia es
   * la garantía: un aporte individual puede identificar a una persona (FR-014,
   * amenaza I2), así que la suma la hace la base en una vista y este puerto no
   * ofrece ninguna forma de pedir las filas (ADR-016).
   */
  listReceivedTotals(campaignId: string): Promise<Money[]>;
  listPublishedExpenses(campaignId: string): Promise<ExpenseRecord[]>;
}

export interface MilestoneRepository {
  listPublishedMilestones(campaignId: string): Promise<MilestoneRecord[]>;
}

export interface PaymentMethodRepository {
  /** Sólo métodos con `published_at` no nulo. Es la defensa de FR-007. */
  listPublishedMethods(campaignId: string): Promise<PaymentMethod[]>;
}

export interface UpdateRepository {
  listPublishedUpdates(campaignId: string, limit?: number): Promise<UpdateRecord[]>;
  /** Devuelve `null` si el slug no existe o si todavía no está publicado (I7). */
  findPublishedUpdateBySlug(slug: string): Promise<UpdateRecord | null>;
}

export interface PersonRepository {
  findPublishedPersonBySlug(slug: string): Promise<PersonRecord | null>;
}
