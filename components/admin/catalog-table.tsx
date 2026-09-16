import { Fragment, type ReactNode } from "react";

import { CatalogRowActions } from "@/components/admin/catalog-row-actions";
import type { ActionState } from "@/components/admin/form";
import { ActionForm, SubmitButton } from "@/components/admin/form";
import type { DonationItemAdminRecord } from "@/src/domain/entities";
import { DONATION_UNIT_LABELS } from "@/src/domain/entities";
import { formatMoney } from "@/src/domain/money";

type CatalogAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Qué le falta a la casa, en el backoffice: una tabla con acciones por fila
 * (ADR-050). Ver abre la ficha pública. Editar pone esa fila en modo edición
 * con `?editar=`. Borrar pide confirmación y sólo lo ve quien puede.
 */
export function CatalogAdminTable({
  items,
  editingId,
  canDelete,
  fields,
  saveAction,
  deleteAction,
}: {
  items: readonly DonationItemAdminRecord[];
  editingId: string | null;
  canDelete: boolean;
  fields: (item: DonationItemAdminRecord) => ReactNode;
  saveAction: CatalogAction;
  deleteAction: CatalogAction;
}) {
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain">
      <table className="w-full border-collapse text-left">
        <caption className="mb-md text-left font-ui text-small text-ink-muted">
          La misma lista que `/catalogo`. En cada fila: ver la ficha, editar, y borrar si
          tu rol puede.
        </caption>
        <thead className="table-header-group">
          <tr className="border-b border-rule">
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              Qué
            </th>
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              Cantidad
            </th>
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              Publicado
            </th>
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              Estimado
            </th>
            <th scope="col" className="py-sm font-ui text-label text-ink-muted">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <CatalogAdminRow
              key={item.id}
              item={item}
              editing={editingId === item.id}
              canDelete={canDelete}
              fields={fields}
              saveAction={saveAction}
              deleteAction={deleteAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CatalogAdminRow({
  item,
  editing,
  canDelete,
  fields,
  saveAction,
  deleteAction,
}: {
  item: DonationItemAdminRecord;
  editing: boolean;
  canDelete: boolean;
  fields: (item: DonationItemAdminRecord) => ReactNode;
  saveAction: CatalogAction;
  deleteAction: CatalogAction;
}) {
  const unit = DONATION_UNIT_LABELS[item.unit];
  const quantity = `${String(item.remainingQuantity)} de ${String(item.neededQuantity)} ${unit}`;
  const estimate = item.estimatedValue === null ? "—" : formatMoney(item.estimatedValue);

  return (
    <Fragment>
      <tr
        id={`item-${item.id}`}
        className={
          editing
            ? "scroll-mt-xl border-b border-rule bg-paper-sunk"
            : "scroll-mt-xl border-b border-rule"
        }
      >
        <th
          scope="row"
          className="min-w-0 max-w-quote py-sm pr-md text-left text-body font-normal"
        >
          {item.title}
        </th>
        <td className="whitespace-nowrap py-sm pr-md font-ui text-small text-ink">
          {quantity}
        </td>
        <td className="whitespace-nowrap py-sm pr-md font-ui text-small text-ink-muted">
          {item.publishedAt === null ? "Sin publicar" : "Visible en el sitio"}
        </td>
        <td className="whitespace-nowrap py-sm pr-md font-ui text-small text-ink">
          {estimate}
        </td>
        <td className="py-sm">
          <CatalogRowActions
            item={item}
            editing={editing}
            canDelete={canDelete}
            deleteAction={deleteAction}
          />
        </td>
      </tr>
      {editing ? (
        <tr className="border-b border-rule bg-paper-sunk">
          <td colSpan={5} className="py-md">
            <ActionForm action={saveAction}>
              {fields(item)}
              <SubmitButton tone="quiet" pendingLabel="Guardando…">
                Guardar cambios
              </SubmitButton>
            </ActionForm>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
