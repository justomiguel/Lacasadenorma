import type { ActionState } from "@/components/admin/form";
import { ActionForm, HiddenValue, SubmitButton } from "@/components/admin/form";
import { ICON_ACTION } from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import { EyeIcon, PencilIcon, TrashIcon } from "@/components/design-system/icons";
import type { DonationItemAdminRecord } from "@/src/domain/entities";

type CatalogAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Ver, editar esa fila, borrar. Iconos de acción de 44 px (ADR-032, ADR-050).
 * El nombre accesible no se reemplaza: va en `sr-only`.
 */
export function CatalogRowActions({
  item,
  editing,
  canDelete,
  deleteAction,
}: {
  item: DonationItemAdminRecord;
  editing: boolean;
  canDelete: boolean;
  deleteAction: CatalogAction;
}) {
  const editHref = editing
    ? `/admin/catalogo#item-${item.id}`
    : `/admin/catalogo?editar=${item.id}#item-${item.id}`;

  return (
    <div className="flex flex-nowrap items-center justify-end">
      <a href={`/catalogo/${item.id}`} className={ICON_ACTION}>
        <EyeIcon />
        <span className="sr-only">Ver ficha</span>
      </a>
      <a
        href={editHref}
        className={ICON_ACTION}
        aria-current={editing ? "page" : undefined}
      >
        <PencilIcon />
        <span className="sr-only">{editing ? "Dejar de editar" : "Editar"}</span>
      </a>
      {canDelete ? <DeleteControl item={item} deleteAction={deleteAction} /> : null}
    </div>
  );
}

function DeleteControl({
  item,
  deleteAction,
}: {
  item: DonationItemAdminRecord;
  deleteAction: CatalogAction;
}) {
  return (
    <details className="relative">
      <summary
        role="button"
        className={cn(ICON_ACTION, "cursor-pointer list-none text-danger")}
      >
        <TrashIcon />
        <span className="sr-only">Borrar</span>
      </summary>
      <div className="absolute right-0 z-10 mt-2xs w-measure border border-rule bg-paper p-md">
        <p className="mb-md font-ui text-small text-ink">
          ¿Borrar «{item.title}» del catálogo? También se borran las reservas y
          los avisos de este ítem.
        </p>
        <ActionForm action={deleteAction}>
          <HiddenValue name="id" value={item.id} />
          <HiddenValue name="title" value={item.title} />
          <SubmitButton tone="danger" pendingLabel="Borrando…">
            Borrar del catálogo
          </SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}
