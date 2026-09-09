import { z } from "zod";

import type {
  BudgetItem,
  Campaign,
  ContributionRecord,
  ExpenseRecord,
  MediaAsset,
  MilestoneRecord,
  PaymentMethod,
  PaymentMethodField,
} from "@/src/domain/entities";
import { COUNTRY_CODES } from "@/src/domain/entities";
import { isCurrencyCode, money, type CurrencyCode, type Money } from "@/src/domain/money";

import type { Database } from "./database.types";

/**
 * Traducción de filas de Postgres a entidades del dominio.
 *
 * Es la frontera donde los datos entran al sistema, así que acá se valida y no se
 * confía. Dos cosas concretas que la base no puede garantizar por tipo y que
 * podrían llegar mal:
 *
 * 1. `currency` es `char(3)` con una restricción de formato, pero nada impide un
 *    `'EUR'` que el dominio no conoce. Se rechaza con un error nombrado.
 * 2. `payment_methods.fields` es `jsonb`, que en TypeScript es `Json`. Se valida
 *    con Zod: los datos bancarios son lo último que alguien lee antes de
 *    transferir, y un campo con la forma equivocada tiene que romper acá y no
 *    renderizarse a medias.
 *
 * Los errores de este módulo son `MappingError`. Los casos de uso los atrapan y
 * devuelven `unavailable("error")` con el detalle en el log, nunca en la pantalla.
 */

export class MappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MappingError";
  }
}

/**
 * Cada mapeador recibe **exactamente** las columnas que lee, no la fila entera.
 *
 * No es cosmética: así la consulta y el mapeador comparten una única lista de
 * columnas verificada por el compilador. Si mañana alguien agrega
 * `contributor_display_name` al `select` de la capa pública, el tipo no cambia y el
 * dato no llega al dominio; y si alguien quita una columna del `select`, el
 * mapeador deja de compilar en lugar de leer `undefined`.
 */
type Tables = Database["public"]["Tables"];

export type CampaignRow = Pick<
  Tables["campaigns"]["Row"],
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "goal_amount_minor"
  | "goal_currency"
  | "status"
  | "reconciled_at"
>;

export type BudgetItemRow = Pick<
  Tables["budget_items"]["Row"],
  "id" | "title" | "description" | "estimated_amount_minor" | "currency" | "sort_order"
>;

export type ContributionRow = Pick<
  Tables["contributions"]["Row"],
  "id" | "amount_minor" | "currency" | "received_at" | "voided_at"
>;

export type ExpenseRow = Pick<
  Tables["expenses"]["Row"],
  | "id"
  | "amount_minor"
  | "currency"
  | "spent_at"
  | "concept"
  | "category"
  | "supplier"
  | "budget_item_id"
  | "receipt_count"
  | "voided_at"
>;

export type MilestoneRow = Pick<
  Tables["milestones"]["Row"],
  "id" | "title" | "description" | "status" | "happened_on" | "sort_order"
>;

export type PaymentMethodRow = Pick<
  Tables["payment_methods"]["Row"],
  | "id"
  | "kind"
  | "country_code"
  | "currency"
  | "label"
  | "fields"
  | "instructions"
  | "sort_order"
>;

export type MediaRow = Pick<
  Tables["media"]["Row"],
  "id" | "storage_path" | "alt_text" | "caption" | "credit" | "width" | "height" | "taken_on"
>;

function toCurrency(value: string, context: string): CurrencyCode {
  const trimmed = value.trim();

  if (!isCurrencyCode(trimmed)) {
    throw new MappingError(
      `${context}: la moneda "${trimmed}" no está entre las que el dominio maneja.`,
    );
  }

  return trimmed;
}

function toMoney(amountMinor: number, currency: string, context: string): Money {
  return money(amountMinor, toCurrency(currency, context));
}

export function mapCampaign(row: CampaignRow): Campaign {
  const goalCurrency = toCurrency(row.goal_currency, `campaigns.${row.id}`);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    // Nulo es "objetivo no verificado todavía". Nunca se convierte en cero.
    goal:
      row.goal_amount_minor === null
        ? null
        : money(row.goal_amount_minor, goalCurrency),
    goalCurrency,
    status: row.status,
    reconciledAt: row.reconciled_at,
  };
}

export function mapBudgetItem(row: BudgetItemRow): BudgetItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    estimatedAmount:
      row.estimated_amount_minor === null
        ? null
        : toMoney(row.estimated_amount_minor, row.currency, `budget_items.${row.id}`),
    sortOrder: row.sort_order,
  };
}

/**
 * Un aporte pierde acá todo lo que podría identificar a una persona: el nombre, la
 * nota de conciliación, el método por el que entró. No es que la capa pública "no
 * los use": es que no los recibe (FR-014).
 */
export function mapContribution(row: ContributionRow): ContributionRecord {
  return {
    id: row.id,
    amount: toMoney(row.amount_minor, row.currency, `contributions.${row.id}`),
    receivedAt: row.received_at,
    voidedAt: row.voided_at,
  };
}

export function mapExpense(row: ExpenseRow): ExpenseRecord {
  return {
    id: row.id,
    amount: toMoney(row.amount_minor, row.currency, `expenses.${row.id}`),
    spentAt: row.spent_at,
    concept: row.concept,
    category: row.category,
    supplier: row.supplier,
    budgetItemId: row.budget_item_id,
    // Contador derivado que mantiene el trigger. Publica que el comprobante
    // existe, nunca el archivo (FR-013).
    receiptCount: row.receipt_count,
    voidedAt: row.voided_at,
  };
}

export function mapMilestone(row: MilestoneRow): MilestoneRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    happenedOn: row.happened_on,
    sortOrder: row.sort_order,
  };
}

/**
 * Los campos de una cuenta bancaria. Se valida la forma completa, y un método con
 * un campo mal formado se descarta entero: media cuenta es peor que ninguna.
 */
const paymentFieldsSchema = z.array(
  z.object({
    label: z.string().trim().min(1),
    value: z.string().trim().min(1),
    copyable: z.boolean(),
    hint: z.string().trim().min(1).nullable().default(null),
  }),
);

export function mapPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  const parsed = paymentFieldsSchema.safeParse(row.fields);

  if (!parsed.success) {
    throw new MappingError(
      `payment_methods.${row.id}: los campos de la cuenta no tienen la forma esperada. ` +
        parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    );
  }

  const countryCode = row.country_code.trim();

  if (!(COUNTRY_CODES as readonly string[]).includes(countryCode)) {
    throw new MappingError(
      `payment_methods.${row.id}: el país "${countryCode}" no está entre los publicables.`,
    );
  }

  const fields: PaymentMethodField[] = parsed.data.map((field) => ({
    label: field.label,
    value: field.value,
    copyable: field.copyable,
    hint: field.hint,
  }));

  return {
    id: row.id,
    kind: row.kind,
    countryCode: countryCode as PaymentMethod["countryCode"],
    currency: toCurrency(row.currency, `payment_methods.${row.id}`),
    label: row.label,
    fields,
    instructions: row.instructions,
    sortOrder: row.sort_order,
  };
}

/**
 * Una foto. `publicUrlFor` traduce la ruta del bucket a una URL absoluta; se pasa
 * como función para que este módulo no dependa del cliente de Supabase.
 */
export function mapMedia(row: MediaRow, publicUrlFor: (storagePath: string) => string): MediaAsset {
  return {
    id: row.id,
    url: publicUrlFor(row.storage_path),
    alt: row.alt_text,
    caption: row.caption,
    credit: row.credit,
    width: row.width,
    height: row.height,
    takenOn: row.taken_on,
  };
}
