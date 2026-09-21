import type { Money } from "../money";

/**
 * Un aporte recibido. El monto **nunca es público** (FR-014): esta forma existe
 * para calcular agregados y para el backoffice. El nombre público, si hay
 * consentimiento, vive en `contribution_wall` y no acá, justamente para que no
 * pueda filtrarse desde la capa de totales por descuido.
 */
export interface ContributionRecord {
  readonly id: string;
  readonly amount: Money;
  readonly receivedAt: string;
  readonly voidedAt: string | null;
}

/** Vista administrativa: incluye los campos internos que el público no ve. */
export interface ContributionAdminRecord extends ContributionRecord {
  readonly paymentMethodId: string | null;
  readonly sourceNote: string | null;
  readonly isAnonymous: boolean;
  readonly contributorDisplayName: string | null;
  readonly voidReason: string | null;
  readonly recordedBy: string | null;
  /** Persona a la que se ata el aporte. Nulo en los de antes y en Aportes sin ficha. */
  readonly userId: string | null;
}
