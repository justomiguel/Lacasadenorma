import { CatalogItemFields } from "@/components/admin/catalog-fields";
import { CatalogAdminTable } from "@/components/admin/catalog-table";
import { ActionForm, SubmitButton } from "@/components/admin/form";
import { NoRecords } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import {
  DONATION_ITEM_CATEGORIES,
  DONATION_ITEM_CATEGORY_LABELS,
  DONATION_UNIT_LABELS,
  DONATION_UNITS,
  type DonationItemAdminRecord,
} from "@/src/domain/entities";
import { CURRENCIES } from "@/src/domain/money";
import { can } from "@/src/domain/permissions";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { deleteDonationItemAction, saveDonationItemAction } from "./actions";

/**
 * Catálogo de donaciones en especie.
 *
 * Qué falta, en una tabla, con ver / editar esa fila / borrar (ADR-050). El
 * HTML de `/catalogo` no se personaliza.
 */
export default async function AdminCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requirePermission("catalogo.escribir");
  const scope = await getAdminScope();
  const params = await searchParams;
  const editingId = typeof params.editar === "string" ? params.editar : null;
  const canDelete = can(viewer.role, "catalogo.borrar");

  const heading = (
    <AdminHeading title="Catálogo">
      Qué le falta a la casa, en especie. Es lo que `/catalogo` muestra. En cada fila: ver
      la ficha, editar, y borrar si tu rol puede.
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
  const items = await gateway.catalog.listItems(campaign.id);
  const budget = await gateway.campaign.listBudgetItems(campaign.id);

  const unitOptions = DONATION_UNITS.map((unit) => ({
    value: unit,
    label: DONATION_UNIT_LABELS[unit],
  }));
  const categoryOptions = DONATION_ITEM_CATEGORIES.map((category) => ({
    value: category,
    label: DONATION_ITEM_CATEGORY_LABELS[category],
  }));
  const currencyOptions = CURRENCIES.map((code) => ({ value: code, label: code }));
  const budgetOptions = [
    { value: "", label: "Sin rubro asociado" },
    ...budget.map((item) => ({ value: item.id, label: item.title })),
  ];
  const nextOrder =
    items.length === 0 ? 10 : Math.max(...items.map((item) => item.sortOrder)) + 10;

  function fields(item: DonationItemAdminRecord | null) {
    return (
      <CatalogItemFields
        item={item}
        campaignId={campaign.id}
        goalCurrency={campaign.goalCurrency}
        nextOrder={nextOrder}
        unitOptions={unitOptions}
        categoryOptions={categoryOptions}
        currencyOptions={currencyOptions}
        budgetOptions={budgetOptions}
      />
    );
  }

  return (
    <>
      {heading}

      <Panel
        id="nuevo"
        title="Agregar un ítem"
        tone="sunk"
        description="Uno por cosa que hace falta. La cantidad es un entero; el valor estimado se publica etiquetado."
      >
        <ActionForm action={saveDonationItemAction} resetOnSuccess>
          {fields(null)}
          <SubmitButton pendingLabel="Guardando…">Guardar ítem</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel id="lista" title="Qué le falta a la casa">
        {params.hecho === "borrado" ? (
          <p role="status" className="mb-lg font-ui text-small text-success">
            Ítem borrado.
          </p>
        ) : null}
        {items.length === 0 ? (
          <NoRecords>
            Todavía no hay ítems. La página pública omite el listado y explica que todavía
            no hay uno publicado.
          </NoRecords>
        ) : (
          <CatalogAdminTable
            items={items}
            editingId={editingId}
            canDelete={canDelete}
            fields={(item) => fields(item)}
            saveAction={saveDonationItemAction}
            deleteAction={deleteDonationItemAction}
          />
        )}
      </Panel>
    </>
  );
}
