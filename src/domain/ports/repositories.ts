import type {
  BudgetItem,
  Campaign,
  ExpenseRecord,
  MilestoneRecord,
  PaymentMethod,
  UpdateRecord,
} from "../entities";
import type { Money } from "../money";

/**
 * Puertos de lectura pública, implementados sobre Supabase. Cuando no hay proyecto
 * configurado no hay una segunda implementación de estos puertos: la capa de datos
 * es una unión y devuelve `{ source: "content-only" }`, sin repositorios (ADR-005,
 * FR-034). Es a propósito —un repositorio falso que devuelve listas vacías haría que
 * "no hay cifras cargadas" y "no hay base configurada" se vieran igual, y son cosas
 * distintas que el sitio tiene que explicar distinto—.
 *
 * Todos los métodos devuelven **sólo material publicado**. Los borradores no
 * tienen camino de lectura pública, ni por descuido: la forma de estos puertos
 * no permite pedirlos.
 *
 * No hay puerto de lectura para `people`. La prosa sobre Norma vive en `content/`
 * (ADR-007) y la tabla queda reservada para cuando el backoffice la edite; declarar
 * el puerto antes de que exista quien lo implemente sería una promesa sin dueño.
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
