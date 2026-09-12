import Link from "next/link";

import {
  ActionForm,
  CheckboxField,
  FileField,
  HiddenValue,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseReceiptRecord,
} from "@/src/domain/entities";
import { CURRENCIES, formatMoney } from "@/src/domain/money";
import { can } from "@/src/domain/permissions";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";
import { ALLOWED_RECEIPT_TYPES } from "@/src/infrastructure/files/image";

import { attachReceiptAction, recordExpenseAction, voidExpenseAction } from "./actions";

/**
 * Gastos.
 *
 * La pantalla que sostiene la promesa del proyecto: cada peso que sale se anota acá,
 * con su fecha y su comprobante, y aparece en la página pública.
 *
 * Dos cosas que no están y es a propósito:
 *
 * - **No hay botón de borrar.** Un gasto cargado por error se anula con motivo, y
 *   sigue en el libro tachado. Es el requisito de auditoría (FR-015) y también es lo
 *   honesto: un error corregido en silencio es indistinguible de un dato que se ocultó.
 * - **No hay campo de comprobante en el formulario de carga.** Se sube después, sobre
 *   el gasto ya registrado, porque en la obra se anota el gasto en el momento y la
 *   foto de la factura llega más tarde. Obligar a las dos cosas juntas haría que no se
 *   anotara ninguna.
 *
 * Un rol de auditoría ve todo esto sin ningún formulario: puede leer y abrir
 * comprobantes, y no puede escribir nada.
 */
export default async function AdminGastosPage() {
  const viewer = await requirePermission("finanzas.leer");
  const scope = await getAdminScope();
  const puedeEscribir = can(viewer.role, "finanzas.escribir");

  const heading = (
    <AdminHeading title="Gastos">
      Todo lo que se registra acá aparece en la página de transparencia con su fecha.
    </AdminHeading>
  );

  if (scope.state !== "lista") {
    return (
      <>
        {heading}
        <SinDatos state={scope.state} />
      </>
    );
  }

  const { gateway, campaign } = scope;

  const [expenses, budgetItems] = await Promise.all([
    gateway.expenses.listExpenses(campaign.id),
    gateway.campaign.listBudgetItems(campaign.id),
  ]);

  // Los comprobantes se leen por gasto: son la evidencia, y mostrarlos junto al gasto
  // es lo que permite ver de un vistazo cuál todavía no tiene respaldo.
  const receipts = new Map<string, ExpenseReceiptRecord[]>(
    await Promise.all(
      expenses
        .filter((expense) => expense.receiptCount > 0)
        .map(
          async (expense) =>
            [expense.id, await gateway.expenses.listReceipts(expense.id)] as const,
        ),
    ),
  );

  return (
    <>
      {heading}

      {puedeEscribir ? (
        <Panel
          id="nuevo"
          title="Registrar un gasto"
          tone="sunk"
          description="El comprobante se sube después, sobre el gasto ya cargado."
        >
          <ActionForm action={recordExpenseAction} resetOnSuccess>
            <HiddenValue name="campaignId" value={campaign.id} />
            <div className="grid gap-lg sm:grid-cols-2">
              <TextField
                name="amount"
                label="Monto"
                required
                inputMode="decimal"
                placeholder="1.240.000"
                hint="Punto para los miles, coma para los centavos."
              />
              <SelectField
                name="currency"
                label="Moneda"
                required
                defaultValue={campaign.goalCurrency}
                options={CURRENCIES.map((code) => ({ value: code, label: code }))}
              />
              <TextField name="spentAt" label="Fecha del gasto" type="date" required />
              <SelectField
                name="category"
                label="Categoría"
                required
                options={EXPENSE_CATEGORIES.map((category) => ({
                  value: category,
                  label: EXPENSE_CATEGORY_LABELS[category],
                }))}
              />
            </div>
            <TextField
              name="concept"
              label="Concepto"
              required
              maxLength={200}
              placeholder="Chapas y tornillos para el techo"
            />
            <TextField name="supplier" label="Proveedor" maxLength={120} />
            {budgetItems.length === 0 ? null : (
              <SelectField
                name="budgetItemId"
                label="Rubro del presupuesto"
                options={[
                  { value: "", label: "Sin imputar a un rubro" },
                  ...budgetItems.map((item) => ({
                    value: item.id,
                    label: item.title,
                  })),
                ]}
              />
            )}
            <CheckboxField
              name="publish"
              label="Publicarlo en transparencia"
              defaultChecked
              hint="Sin marcar queda registrado pero no visible. Un gasto sin publicar no suma en el total público."
            />
            <SubmitButton pendingLabel="Registrando…">Registrar gasto</SubmitButton>
          </ActionForm>
        </Panel>
      ) : (
        <Callout title="Sólo lectura">
          <p>
            Tu rol puede ver los gastos y abrir los comprobantes, y no puede registrar ni
            anular nada.
          </p>
        </Callout>
      )}

      <Panel id="lista" title="El libro completo">
        {expenses.length === 0 ? (
          <NoRecords>
            Todavía no hay gastos. Los aportes están en la cuenta sin ejecutar, y la
            página pública lo dice así.
          </NoRecords>
        ) : (
          <RecordList>
            {expenses.map((expense) => {
              const anulado = expense.voidedAt !== null;

              return (
                <Record
                  key={expense.id}
                  title={expense.concept}
                  amount={formatMoney(expense.amount)}
                  muted={anulado}
                  meta={`${expense.spentAt} · ${EXPENSE_CATEGORY_LABELS[expense.category]}${
                    expense.supplier === null ? "" : ` · ${expense.supplier}`
                  }`}
                  status={
                    anulado
                      ? `Anulado: ${expense.voidReason ?? "sin motivo registrado"}`
                      : expense.publishedAt === null
                        ? "Sin publicar"
                        : expense.receiptCount === 0
                          ? "Publicado, sin comprobante"
                          : `Publicado, ${String(expense.receiptCount)} comprobante${expense.receiptCount === 1 ? "" : "s"}`
                  }
                >
                  {anulado ? null : (
                    <div className="space-y-sm">
                      {(receipts.get(expense.id) ?? []).map((receipt) => (
                        <p key={receipt.id}>
                          <Link
                            href={`/admin/comprobantes/${receipt.id}`}
                            className="font-ui text-small text-aqua underline decoration-1 underline-offset-4"
                          >
                            Ver {receipt.fileName}
                          </Link>
                        </p>
                      ))}

                      {puedeEscribir ? (
                        <>
                          <RowAction label="Subir comprobante">
                            <ActionForm action={attachReceiptAction}>
                              <HiddenValue name="expenseId" value={expense.id} />
                              <FileField
                                name="file"
                                label="Archivo"
                                required
                                accept={ALLOWED_RECEIPT_TYPES.join(",")}
                                hint="Foto de la factura o PDF. No se publica: sólo se publica que existe."
                              />
                              <SubmitButton pendingLabel="Subiendo…" tone="quiet">
                                Archivar comprobante
                              </SubmitButton>
                            </ActionForm>
                          </RowAction>

                          <RowAction label="Anular este gasto" tone="danger">
                            <ActionForm action={voidExpenseAction}>
                              <HiddenValue name="id" value={expense.id} />
                              <TextAreaField
                                name="reason"
                                label="Por qué se anula"
                                required
                                rows={3}
                                hint="Queda registrado para siempre, junto al gasto. No se borra nada."
                              />
                              <SubmitButton tone="danger" pendingLabel="Anulando…">
                                Anular gasto
                              </SubmitButton>
                            </ActionForm>
                          </RowAction>
                        </>
                      ) : null}
                    </div>
                  )}
                </Record>
              );
            })}
          </RecordList>
        )}
      </Panel>
    </>
  );
}
