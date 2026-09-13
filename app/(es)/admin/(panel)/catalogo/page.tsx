import {
  ActionForm,
  CheckboxField,
  defaultOf,
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
  DONATION_UNIT_LABELS,
  DONATION_UNITS,
  type DonationItemAdminRecord,
} from "@/src/domain/entities";
import { CURRENCIES, formatMoney } from "@/src/domain/money";
import { amountToInputValue } from "@/src/domain/money-input";
import { ALLOWED_IMAGE_TYPES } from "@/src/infrastructure/files/image";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { saveDonationItemAction } from "./actions";

/**
 * Catálogo de donaciones en especie.
 *
 * Qué falta, cuánto, y con qué foto. El valor estimado es interno y no se publica.
 * Bajar la cantidad por debajo de lo ya comprometido lo rechaza la base; el
 * formulario traduce ese error.
 */
export default async function AdminCatalogoPage() {
  await requirePermission("catalogo.escribir");
  const scope = await getAdminScope();

  const heading = (
    <AdminHeading title="Catálogo">
      Qué le falta a la casa, en especie. Es lo que `/catalogo` muestra. El valor estimado
      no sale del backoffice.
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
  const currencyOptions = CURRENCIES.map((code) => ({ value: code, label: code }));
  const budgetOptions = [
    { value: "", label: "Sin rubro asociado" },
    ...budget.map((item) => ({ value: item.id, label: item.title })),
  ];

  const nextOrder =
    items.length === 0 ? 10 : Math.max(...items.map((item) => item.sortOrder)) + 10;

  function fields(item: DonationItemAdminRecord | null) {
    const committed = item === null ? 0 : item.reservedQuantity + item.fulfilledQuantity;

    return (
      <>
        <HiddenValue name="campaignId" value={campaign.id} />
        {item === null ? null : <HiddenValue name="id" value={item.id} />}
        {item?.photoMediaId === null || item === null ? null : (
          <HiddenValue name="photoMediaId" value={item.photoMediaId} />
        )}
        <TextField
          name="title"
          label="Qué hace falta"
          required
          maxLength={140}
          placeholder="Chapas del techo"
          {...defaultOf(item?.title)}
        />
        <TextAreaField
          name="description"
          label="Qué sirve y qué no"
          rows={3}
          maxLength={500}
          hint="Medida, material, calidad. Aparece debajo del título."
          {...defaultOf(item?.description)}
        />
        <div className="grid gap-lg sm:grid-cols-2">
          <SelectField
            name="unit"
            label="Unidad"
            required
            options={unitOptions}
            defaultValue={item?.unit ?? "unidad"}
          />
          <TextField
            name="neededQuantity"
            label="Cuántas hacen falta"
            required
            inputMode="numeric"
            hint={
              committed === 0
                ? "Un entero. No se puede bajar por debajo de lo ya comprometido."
                : `Hay ${String(committed)} comprometidas. No se puede pedir menos.`
            }
            defaultValue={String(item?.neededQuantity ?? 1)}
          />
        </div>
        <SelectField
          name="budgetItemId"
          label="Rubro del presupuesto"
          options={budgetOptions}
          defaultValue={item?.budgetItemId ?? ""}
          hint="Opcional. Para que el catálogo y el presupuesto hablen de la misma obra."
        />
        <div className="grid gap-lg sm:grid-cols-2">
          <TextField
            name="amount"
            label="Valor estimado por unidad"
            inputMode="decimal"
            hint="Interno. No se publica. Vacío si no hay cifra."
            {...defaultOf(
              item?.estimatedValue === null || item?.estimatedValue === undefined
                ? null
                : amountToInputValue(item.estimatedValue),
            )}
          />
          <SelectField
            name="currency"
            label="Moneda"
            required
            options={currencyOptions}
            defaultValue={item?.estimatedValue?.currency ?? campaign.goalCurrency}
          />
        </div>
        <FileField
          name="file"
          label="Foto"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          hint="JPEG, PNG o WebP. Sin foto se reserva el espacio en el sitio."
        />
        <TextField
          name="alt"
          label="Qué se ve en la foto"
          maxLength={300}
          hint="Obligatorio si subís una foto. Describe lo que se ve, no el archivo."
        />
        <TextField
          name="sortOrder"
          label="Orden"
          inputMode="numeric"
          hint="De menor a mayor. Primero lo que más falta."
          defaultValue={String(item?.sortOrder ?? nextOrder)}
        />
        <CheckboxField
          name="publish"
          label="Mostrarlo en el sitio"
          defaultChecked={item === null ? true : item.publishedAt !== null}
          hint="Sin marcar queda guardado y no aparece en /catalogo."
        />
      </>
    );
  }

  return (
    <>
      {heading}

      <Panel
        id="nuevo"
        title="Agregar un ítem"
        tone="sunk"
        description="Uno por cosa que hace falta. La cantidad es un entero; el valor estimado no se publica."
      >
        <ActionForm action={saveDonationItemAction} resetOnSuccess>
          {fields(null)}
          <SubmitButton pendingLabel="Guardando…">Guardar ítem</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel id="lista" title="El catálogo cargado">
        {items.length === 0 ? (
          <NoRecords>
            Todavía no hay ítems. La página pública omite el listado y explica que todavía
            no hay uno publicado.
          </NoRecords>
        ) : (
          <RecordList>
            {items.map((item) => (
              <Record
                key={item.id}
                title={item.title}
                meta={`${String(item.remainingQuantity)} de ${String(item.neededQuantity)} ${DONATION_UNIT_LABELS[item.unit]}`}
                amount={
                  item.estimatedValue === null
                    ? "Sin valor estimado"
                    : formatMoney(item.estimatedValue)
                }
                status={
                  item.publishedAt === null ? "Sin publicar" : "Visible en el sitio"
                }
              >
                {item.photo === null ? (
                  <Callout className="mb-lg" title="Sin foto">
                    <p>El sitio reserva el espacio y dice qué va a verse ahí.</p>
                  </Callout>
                ) : null}
                <RowAction label="Editar este ítem">
                  <ActionForm action={saveDonationItemAction}>
                    {fields(item)}
                    <SubmitButton tone="quiet" pendingLabel="Guardando…">
                      Guardar cambios
                    </SubmitButton>
                  </ActionForm>
                </RowAction>
              </Record>
            ))}
          </RecordList>
        )}
      </Panel>
    </>
  );
}
