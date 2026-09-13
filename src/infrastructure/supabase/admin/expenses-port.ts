import type { ExpenseAdminRecord, ExpenseReceiptRecord } from "@/src/domain/entities";
import type { AdminExpensePort } from "@/src/domain/ports/admin";

import { inspectReceipt, storageKeyFor, UnsupportedFileError } from "../../files/image";
import { mapExpense } from "../mappers";
import type { ServerSupabaseClient } from "../server-client";
import { EXPENSE_ADMIN_COLUMNS, RECEIPT_BUCKET, RECEIPT_COLUMNS } from "./columns";
import { QueryError } from "./query";

interface ReceiptRow {
  id: string;
  expense_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}

function mapReceipt(row: ReceiptRow): ExpenseReceiptRecord {
  return {
    id: row.id,
    expenseId: row.expense_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
  };
}

export function createExpensesPort(client: ServerSupabaseClient): AdminExpensePort {
  return {
    async listExpenses(campaignId): Promise<ExpenseAdminRecord[]> {
      const { data, error } = await client
        .from("expenses")
        .select(EXPENSE_ADMIN_COLUMNS)
        .eq("campaign_id", campaignId)
        .order("spent_at", { ascending: false });

      if (error !== null) {
        throw new QueryError("leer los gastos", error);
      }

      return data.map((row) => ({
        ...mapExpense(row),
        voidReason: row.void_reason,
        publishedAt: row.published_at,
        recordedBy: row.recorded_by,
      }));
    },

    async recordExpense(input): Promise<string> {
      const { data, error } = await client
        .from("expenses")
        .insert({
          campaign_id: input.campaignId,
          budget_item_id: input.budgetItemId,
          amount_minor: input.amount.amountMinor,
          currency: input.amount.currency,
          spent_at: input.spentAt,
          concept: input.concept,
          category: input.category,
          supplier: input.supplier,
          published_at: input.publish ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (error !== null) {
        throw new QueryError("registrar el gasto", error);
      }

      return data.id;
    },

    async voidExpense({ id, reason }): Promise<void> {
      const { error } = await client
        .from("expenses")
        .update({ voided_at: new Date().toISOString(), void_reason: reason })
        .eq("id", id);

      if (error !== null) {
        throw new QueryError("anular el gasto", error);
      }
    },

    /**
     * Validar, subir, registrar. En ese orden, y el orden es el contrato del
     * puerto: si la fila se creara antes de que el archivo esté arriba, un fallo
     * de red dejaría un gasto que dice tener comprobante y no lo tiene, que es
     * exactamente la clase de dato sin respaldo que la transparencia promete que
     * no existe.
     */
    async uploadReceipt({ expenseId, file }): Promise<{ fileName: string }> {
      const info = await inspectReceipt(file);
      const key = storageKeyFor(info.mimeType);

      const { error: uploadError } = await client.storage
        .from(RECEIPT_BUCKET)
        .upload(key, file, { contentType: info.mimeType, upsert: false });

      if (uploadError !== null) {
        throw new UnsupportedFileError(
          `No pudimos subir el comprobante: ${uploadError.message}`,
        );
      }

      const { error } = await client.from("expense_receipts").insert({
        expense_id: expenseId,
        storage_path: key,
        // El nombre original se guarda para que una auditoría pueda cruzarlo con
        // el papel; la clave de storage la genera el servidor, así que un nombre
        // hostil no puede convertirse en una ruta.
        file_name: file.name.slice(0, 200),
        mime_type: info.mimeType,
        size_bytes: file.size,
      });

      if (error !== null) {
        throw new QueryError("registrar el comprobante", error);
      }

      return { fileName: file.name };
    },

    async listReceipts(expenseId): Promise<ExpenseReceiptRecord[]> {
      const { data, error } = await client
        .from("expense_receipts")
        .select(RECEIPT_COLUMNS)
        .eq("expense_id", expenseId)
        .order("uploaded_at", { ascending: true });

      if (error !== null) {
        throw new QueryError("leer los comprobantes", error);
      }

      return data.map(mapReceipt);
    },

    async findReceipt(id): Promise<ExpenseReceiptRecord | null> {
      const { data, error } = await client
        .from("expense_receipts")
        .select(RECEIPT_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      if (error !== null) {
        throw new QueryError("leer el comprobante", error);
      }

      return data === null ? null : mapReceipt(data);
    },

    /**
     * URL firmada y de vida corta. El bucket de comprobantes **nunca** es público:
     * una factura suele traer el nombre y el domicilio de un proveedor, y publicar
     * eso sería filtrar datos de un tercero que no eligió aparecer (amenaza I1).
     */
    async createReceiptLink({ storagePath, expiresInSeconds }): Promise<string> {
      const { data, error } = await client.storage
        .from(RECEIPT_BUCKET)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error !== null) {
        throw new QueryError("firmar el comprobante", error);
      }

      return data.signedUrl;
    },
  };
}
