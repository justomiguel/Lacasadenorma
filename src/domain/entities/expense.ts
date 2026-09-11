import type { Money } from "../money";

export const EXPENSE_CATEGORIES = [
  "materiales",
  "mano_de_obra",
  "servicios",
  "transporte",
  "herramientas",
  "otros",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  materiales: "Materiales",
  mano_de_obra: "Mano de obra",
  servicios: "Servicios",
  transporte: "Transporte",
  herramientas: "Herramientas",
  otros: "Otros",
};

/**
 * Un gasto ejecutado. Es público (FR-011), incluido `receiptCount`: se publica
 * que el comprobante existe, nunca el archivo (FR-013).
 */
export interface ExpenseRecord {
  readonly id: string;
  readonly amount: Money;
  readonly spentAt: string;
  readonly concept: string;
  readonly category: ExpenseCategory;
  readonly supplier: string | null;
  readonly budgetItemId: string | null;
  readonly receiptCount: number;
  readonly voidedAt: string | null;
}

export interface ExpenseAdminRecord extends ExpenseRecord {
  readonly voidReason: string | null;
  readonly publishedAt: string | null;
  readonly recordedBy: string | null;
}

export interface ExpenseReceiptRecord {
  readonly id: string;
  readonly expenseId: string;
  readonly storagePath: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}
