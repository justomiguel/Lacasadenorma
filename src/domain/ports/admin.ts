import type {
  BudgetItem,
  Campaign,
  ContributionAdminRecord,
  ExpenseAdminRecord,
  ExpenseCategory,
  MediaAsset,
  MilestoneRecord,
  MilestoneStatus,
  PaymentMethod,
  UpdateRecord,
} from "../entities";
import type { AppRole } from "../entities/role";
import type { Money } from "../money";

/**
 * Puertos del backoffice.
 *
 * Están separados de los de lectura pública y no es una separación cosmética: los
 * puertos públicos **no ofrecen** ninguna forma de leer un borrador ni un aporte
 * individual, y esa imposibilidad es parte de la defensa (amenazas I2, I7). Si
 * hubiera un solo conjunto de puertos con un parámetro `incluirBorradores`, la
 * garantía pasaría a depender de que nadie lo pase en `true` desde una página
 * pública.
 *
 * Tres reglas que la forma de estos tipos impone:
 *
 * 1. **Nada se borra.** No hay ningún método `delete` sobre un registro
 *    financiero. Un aporte o un gasto cargado por error se **anula** con motivo y
 *    fecha, y deja de sumar. Es el requisito de auditoría, y acá se cumple por
 *    ausencia de la operación, no por disciplina.
 * 2. **`alt` es obligatorio al crear una foto.** No es opcional en el tipo, así que
 *    una foto sin descripción no compila (FR-024).
 * 3. **El registro de auditoría sólo se agrega.** `AuditPort` no tiene forma de
 *    modificar ni de borrar, igual que la tabla no tiene policy para eso.
 */

// ── Campaña y presupuesto ───────────────────────────────────────────────────

export interface AdminCampaignPort {
  /** La campaña sin filtrar por estado: el backoffice ve borradores. */
  getCampaign(): Promise<Campaign | null>;
  listBudgetItems(campaignId: string): Promise<BudgetItem[]>;
  updateGoal(input: {
    campaignId: string;
    goal: Money | null;
  }): Promise<void>;
  saveBudgetItem(input: {
    campaignId: string;
    id: string | null;
    title: string;
    description: string | null;
    estimatedAmount: Money | null;
    sortOrder: number;
    publish: boolean;
  }): Promise<string>;
}

// ── Finanzas ────────────────────────────────────────────────────────────────

export interface AdminContributionPort {
  listContributions(campaignId: string): Promise<ContributionAdminRecord[]>;
  recordContribution(input: {
    campaignId: string;
    amount: Money;
    receivedAt: string;
    paymentMethodId: string | null;
    sourceNote: string | null;
  }): Promise<string>;
  voidContribution(input: { id: string; reason: string }): Promise<void>;
  /** Marca la fecha de conciliación bancaria de la campaña. */
  markReconciled(input: { campaignId: string; reconciledAt: string }): Promise<void>;
}

export interface AdminExpensePort {
  listExpenses(campaignId: string): Promise<ExpenseAdminRecord[]>;
  recordExpense(input: {
    campaignId: string;
    amount: Money;
    spentAt: string;
    concept: string;
    category: ExpenseCategory;
    supplier: string | null;
    budgetItemId: string | null;
    publish: boolean;
  }): Promise<string>;
  voidExpense(input: { id: string; reason: string }): Promise<void>;
  /**
   * Valida el archivo por su contenido, lo sube al bucket privado y **después**
   * registra la fila. Ese orden es parte del contrato: al revés, un fallo de red
   * dejaría un comprobante registrado que no existe, y la página de transparencia
   * diría que hay respaldo donde no hay.
   */
  uploadReceipt(input: { expenseId: string; file: File }): Promise<{ fileName: string }>;
  /** URL firmada de corta duración. El bucket nunca es público (amenaza I1). */
  createReceiptLink(input: {
    storagePath: string;
    expiresInSeconds: number;
  }): Promise<string>;
}

// ── Contenido ───────────────────────────────────────────────────────────────

export interface AdminUpdatePort {
  /** Incluye borradores. Es la diferencia con el puerto público. */
  listUpdates(campaignId: string): Promise<UpdateRecord[]>;
  findUpdate(id: string): Promise<UpdateRecord | null>;
  saveUpdate(input: {
    campaignId: string;
    id: string | null;
    slug: string;
    title: string;
    body: string;
  }): Promise<string>;
  setUpdatePublished(input: { id: string; publishedAt: string | null }): Promise<void>;
  /** Sube la foto al bucket público y crea su fila. `alt` no es opcional. */
  createMedia(input: {
    file: File;
    alt: string;
    caption: string | null;
    credit: string | null;
    takenOn: string | null;
  }): Promise<MediaAsset>;
  attachMediaToUpdate(input: {
    updateId: string;
    mediaId: string;
    sortOrder: number;
  }): Promise<void>;
}

export interface AdminMilestonePort {
  listMilestones(campaignId: string): Promise<MilestoneRecord[]>;
  saveMilestone(input: {
    campaignId: string;
    id: string | null;
    title: string;
    description: string | null;
    status: MilestoneStatus;
    happenedOn: string | null;
    sortOrder: number;
    publish: boolean;
  }): Promise<string>;
}

// ── Cuentas bancarias ───────────────────────────────────────────────────────

export interface AdminPaymentMethodPort {
  listMethods(campaignId: string): Promise<PaymentMethod[]>;
  saveMethod(input: {
    campaignId: string;
    id: string | null;
    countryCode: PaymentMethod["countryCode"];
    currency: PaymentMethod["currency"];
    label: string;
    fields: PaymentMethod["fields"];
    instructions: string | null;
    sortOrder: number;
  }): Promise<string>;
  setMethodPublished(input: { id: string; publishedAt: string | null }): Promise<void>;
}

// ── Auditoría ───────────────────────────────────────────────────────────────

export interface AuditEntry {
  readonly id: string;
  readonly actorId: string | null;
  readonly action: string;
  readonly entityTable: string;
  readonly entityId: string | null;
  readonly diff: Record<string, unknown> | null;
  readonly occurredAt: string;
}

export interface AuditPort {
  /** Sólo agrega. No hay `update` ni `delete`, igual que en la tabla. */
  append(input: {
    action: string;
    entityTable: string;
    entityId: string | null;
    diff: Record<string, unknown> | null;
  }): Promise<void>;
  list(limit: number): Promise<AuditEntry[]>;
}

export interface AdminRolePort {
  listRoles(): Promise<readonly { userId: string; email: string | null; role: AppRole }[]>;
}

/** Todo el backoffice en un objeto, para que la composición ocurra en un solo lugar. */
export interface AdminGateway {
  readonly campaign: AdminCampaignPort;
  readonly contributions: AdminContributionPort;
  readonly expenses: AdminExpensePort;
  readonly updates: AdminUpdatePort;
  readonly milestones: AdminMilestonePort;
  readonly paymentMethods: AdminPaymentMethodPort;
  readonly audit: AuditPort;
}
