import type { CurrencyCode, Money } from "../money";

export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface Campaign {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  /**
   * Nulo significa "no verificado todavía", nunca cero. La interfaz omite la
   * barra de progreso en lugar de mostrar 0%.
   */
  readonly goal: Money | null;
  readonly goalCurrency: CurrencyCode;
  readonly status: CampaignStatus;
  /** Última conciliación bancaria. Es pública: un número sin fecha no es un dato. */
  readonly reconciledAt: string | null;
}

export interface BudgetItem {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  /** Nulo = el rubro existe pero todavía no está cotizado. Se muestra sin monto. */
  readonly estimatedAmount: Money | null;
  readonly sortOrder: number;
}

/**
 * El mismo rubro visto desde el backoffice.
 *
 * Sólo agrega `publishedAt`, y agregarlo es lo que permite que la pantalla diga si un
 * rubro está a la vista del público. El tipo público no lo lleva a propósito: quien
 * lee la lista pública ya sabe que todo lo que ve está publicado, y ofrecer el campo
 * ahí invitaría a filtrar en la capa equivocada.
 */
export interface BudgetItemAdminRecord extends BudgetItem {
  readonly publishedAt: string | null;
}
