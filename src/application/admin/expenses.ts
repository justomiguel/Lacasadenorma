import { z } from "zod";

import { EXPENSE_CATEGORIES } from "@/src/domain/entities";
import { formatMoney } from "@/src/domain/money";

import { perform, type AdminDeps, type AdminResult } from "./core";
import {
  checkbox,
  currency,
  optionalText,
  optionalUuid,
  pastDate,
  requiredText,
  toMoney,
  uuid,
  voidReason,
} from "./fields";

/**
 * Gastos: registrar, anular, adjuntar comprobante.
 *
 * Es el área donde la promesa del proyecto se cumple o se rompe. Tres cosas que no
 * son negociables y están acá:
 *
 * - **No hay forma de borrar un gasto.** El puerto no la ofrece y este módulo
 *   tampoco: se anula con motivo, y el motivo lo exige tanto el esquema de acá como
 *   el `check` de la base (FR-015).
 * - **Toda operación deja rastro en `audit_log`,** con el monto y el concepto en el
 *   diff. Si el registro falla, la operación falla (FR-016).
 * - **El comprobante se sube primero y se registra después.** El orden lo impone el
 *   puerto; acá se respeta, porque al revés un fallo de red dejaría un comprobante
 *   registrado que no existe.
 */

const recordSchema = z
  .object({
    campaignId: uuid("la campaña"),
    amount: z.string({ error: "Falta el monto." }),
    currency,
    spentAt: pastDate,
    concept: requiredText("el concepto"),
    category: z.enum(EXPENSE_CATEGORIES, { error: "Elegí una categoría." }),
    supplier: optionalText(120),
    budgetItemId: optionalUuid,
    publish: checkbox,
  })
  .transform(({ amount, currency: code, ...rest }, ctx) => {
    const money = toMoney(ctx, amount, code);

    return money === null ? z.NEVER : { ...rest, money };
  });

export async function recordExpense(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "finanzas.escribir",
    describe: "registrar el gasto",
    schema: recordSchema,
    input,
    run: async (data) => ({
      id: await deps.gateway.expenses.recordExpense({
        campaignId: data.campaignId,
        amount: data.money,
        spentAt: data.spentAt,
        concept: data.concept,
        category: data.category,
        supplier: data.supplier,
        budgetItemId: data.budgetItemId,
        publish: data.publish,
      }),
    }),
    success: () => "Gasto registrado.",
    audit: (data, output) => ({
      action: "expense.created",
      entityTable: "expenses",
      entityId: output.id,
      diff: {
        amount: formatMoney(data.money),
        spentAt: data.spentAt,
        concept: data.concept,
        category: data.category,
        published: data.publish,
      },
    }),
  });
}

const voidSchema = z.object({
  id: uuid("el gasto"),
  reason: voidReason,
});

export async function voidExpense(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<null>> {
  return perform({
    deps,
    permission: "finanzas.escribir",
    describe: "anular el gasto",
    schema: voidSchema,
    input,
    run: async (data) => {
      await deps.gateway.expenses.voidExpense(data);

      return null;
    },
    success: () => "Gasto anulado. Sigue en el historial y ya no suma.",
    audit: (data) => ({
      action: "expense.voided",
      entityTable: "expenses",
      entityId: data.id,
      diff: { reason: data.reason },
    }),
  });
}

/**
 * El archivo no pasa por Zod: lo valida `inspectReceipt` por su contenido, no por su
 * nombre ni por el `Content-Type` que declara el navegador (amenaza T6). Un esquema
 * que confiara en la extensión daría una falsa sensación de validación.
 */
const receiptSchema = z.object({
  expenseId: uuid("el gasto"),
  file: z.instanceof(File, { error: "Elegí un archivo." }),
});

export async function attachExpenseReceipt(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ fileName: string }>> {
  return perform({
    deps,
    permission: "finanzas.escribir",
    describe: "subir el comprobante",
    schema: receiptSchema,
    input,
    run: async (data) => deps.gateway.expenses.uploadReceipt(data),
    success: (output) => `Comprobante ${output.fileName} archivado.`,
    audit: (data, output) => ({
      action: "expense.receipt_attached",
      entityTable: "expense_receipts",
      entityId: data.expenseId,
      diff: { fileName: output.fileName },
    }),
  });
}

const openReceiptSchema = z.object({ id: uuid("el comprobante") });

/** Un minuto de vida para la URL firmada: alcanza para que el servidor la use. */
const RECEIPT_LINK_SECONDS = 60;

/**
 * Abrir un comprobante.
 *
 * Devuelve una URL firmada de un minuto, pensada para que **el servidor** la use y no
 * para entregarla al navegador: una URL firmada es una credencial, y una credencial en
 * el historial del navegador o en el log de un intermediario deja de ser de corta vida.
 * Quien la consume es el manejador de `/admin/comprobantes/[id]`, que descarga el
 * archivo y lo devuelve él mismo.
 *
 * Mirar un comprobante **se registra**. No es una mutación, pero es un acceso a un dato
 * privado de un tercero —una factura trae el nombre y el domicilio de un proveedor— y
 * quién lo miró es parte de la rendición de cuentas (amenaza I1).
 */
export async function openReceipt(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ url: string; fileName: string; mimeType: string }>> {
  return perform({
    deps,
    permission: "finanzas.leer",
    describe: "abrir el comprobante",
    schema: openReceiptSchema,
    input,
    run: async (data) => {
      const receipt = await deps.gateway.expenses.findReceipt(data.id);

      if (receipt === null) {
        throw new ReceiptNotFoundError();
      }

      return {
        url: await deps.gateway.expenses.createReceiptLink({
          storagePath: receipt.storagePath,
          expiresInSeconds: RECEIPT_LINK_SECONDS,
        }),
        fileName: receipt.fileName,
        mimeType: receipt.mimeType,
      };
    },
    success: () => "Comprobante abierto.",
    audit: (data) => ({
      action: "expense.receipt_viewed",
      entityTable: "expense_receipts",
      entityId: data.id,
      diff: null,
    }),
  });
}

/**
 * Existe como error propio para que el manejador pueda responder 404 en lugar de 500.
 * También cubre el caso de un comprobante que existe pero que la policy no deja leer:
 * la base devuelve cero filas, y desde acá los dos casos son indistinguibles, que es
 * exactamente lo que conviene contestar.
 */
export class ReceiptNotFoundError extends Error {
  constructor() {
    super("Ese comprobante no existe o no lo podés ver.");
    this.name = "ReceiptNotFoundError";
  }
}
