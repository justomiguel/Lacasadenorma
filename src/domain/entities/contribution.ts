import type { Money } from "../money";

/**
 * Un aporte recibido. **Nunca es público individualmente** (FR-014): esta forma
 * existe para calcular agregados y para el backoffice. No lleva el nombre de
 * quien aportó ni la nota interna de conciliación, justamente para que no pueda
 * filtrarse desde la capa pública por descuido.
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
  readonly voidReason: string | null;
  readonly recordedBy: string | null;
}
