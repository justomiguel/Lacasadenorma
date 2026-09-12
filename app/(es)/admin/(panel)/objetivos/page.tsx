import {
  ActionForm,
  CheckboxField,
  defaultOf,
  HiddenValue,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import type { BudgetItemAdminRecord } from "@/src/domain/entities";
import { CURRENCIES, formatMoney } from "@/src/domain/money";
import { amountToInputValue } from "@/src/domain/money-input";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { saveBudgetItemAction, updateGoalAction } from "./actions";

/**
 * Objetivo y presupuesto.
 *
 * Las dos cifras más delicadas del sitio, y las dos pueden quedar vacías a propósito.
 *
 * **El objetivo vacío es una opción legítima.** Mientras no haya un presupuesto hecho
 * por alguien que sepa de obra, publicar una meta sería inventar un número; el sitio
 * muestra el avance sin porcentaje y eso es más honesto que una cifra redonda elegida
 * a ojo. Por eso el campo se puede borrar, y borrarlo es una operación, no un error.
 *
 * **Un rubro sin cotizar también se publica.** Saber *qué* falta arreglar ya es
 * información, y aparece como "sin cotizar" en lugar de con un cero que se leería como
 * "gratis".
 */
export default async function AdminObjetivosPage() {
  await requirePermission("campana.escribir");
  const scope = await getAdminScope();

  const heading = (
    <AdminHeading title="Objetivo y presupuesto">
      La meta de recaudación y los rubros de la obra. Las dos cifras se publican tal como
      se cargan acá.
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
  const items = await gateway.campaign.listBudgetItems(campaign.id);

  const currencyOptions = CURRENCIES.map((code) => ({ value: code, label: code }));

  const nextOrder =
    items.length === 0 ? 10 : Math.max(...items.map((item) => item.sortOrder)) + 10;

  function itemFields(item: BudgetItemAdminRecord | null) {
    return (
      <>
        <HiddenValue name="campaignId" value={campaign.id} />
        {item === null ? null : <HiddenValue name="id" value={item.id} />}
        <TextField
          name="title"
          label="Qué hay que arreglar"
          required
          maxLength={140}
          placeholder="Techo del comedor"
          {...defaultOf(item?.title)}
        />
        <TextAreaField
          name="description"
          label="Detalle"
          rows={3}
          maxLength={500}
          hint="Qué incluye el rubro. Aparece en la página de reconstrucción."
          {...defaultOf(item?.description)}
        />
        <div className="grid gap-lg sm:grid-cols-2">
          <TextField
            name="amount"
            label="Presupuesto estimado"
            inputMode="decimal"
            placeholder="1.240.000"
            hint="Dejalo vacío si todavía no está cotizado. Se publica como “sin cotizar”."
            {...defaultOf(
              item?.estimatedAmount === null || item?.estimatedAmount === undefined
                ? null
                : amountToInputValue(item.estimatedAmount),
            )}
          />
          <SelectField
            name="currency"
            label="Moneda"
            required
            options={currencyOptions}
            defaultValue={item?.estimatedAmount?.currency ?? campaign.goalCurrency}
          />
        </div>
        <TextField
          name="sortOrder"
          label="Orden"
          inputMode="numeric"
          hint="De menor a mayor. Van de diez en diez para poder intercalar."
          defaultValue={String(item?.sortOrder ?? nextOrder)}
        />
        <CheckboxField
          name="publish"
          label="Mostrarlo en el sitio"
          defaultChecked={item === null ? true : item.publishedAt !== null}
        />
      </>
    );
  }

  return (
    <>
      {heading}

      <Panel
        id="objetivo"
        title="La meta de recaudación"
        tone="sunk"
        description="Es el número contra el que el sitio calcula el porcentaje de avance."
      >
        <ActionForm action={updateGoalAction}>
          <HiddenValue name="campaignId" value={campaign.id} />
          <div className="grid gap-lg sm:grid-cols-2">
            <TextField
              name="amount"
              label="Objetivo"
              inputMode="decimal"
              placeholder="8.500.000"
              hint="Vacío significa “todavía no hay objetivo”: el sitio muestra el avance sin porcentaje."
              {...defaultOf(
                campaign.goal === null ? null : amountToInputValue(campaign.goal),
              )}
            />
            <SelectField
              name="currency"
              label="Moneda"
              required
              options={currencyOptions}
              defaultValue={campaign.goalCurrency}
            />
          </div>
          <SubmitButton pendingLabel="Guardando…">Guardar objetivo</SubmitButton>
        </ActionForm>

        {campaign.goal === null ? (
          <Callout title="Sin objetivo publicado" className="mt-lg">
            <p>
              Hoy el sitio muestra cuánto se recibió y cuánto se gastó, sin porcentaje. Es
              la opción prudente hasta tener un presupuesto de obra.
            </p>
          </Callout>
        ) : null}
      </Panel>

      <Panel
        id="nuevo-rubro"
        title="Agregar un rubro"
        description="Un rubro por trabajo. La suma de los rubros es lo que explica de dónde sale el objetivo."
      >
        <ActionForm action={saveBudgetItemAction} resetOnSuccess>
          {itemFields(null)}
          <SubmitButton pendingLabel="Guardando…">Guardar rubro</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel id="rubros" title="El presupuesto cargado">
        {items.length === 0 ? (
          <NoRecords>
            Todavía no hay rubros. La página de reconstrucción explica la obra en palabras
            y omite el cuadro de presupuesto hasta que exista el primero.
          </NoRecords>
        ) : (
          <RecordList>
            {items.map((item) => (
              <Record
                key={item.id}
                title={item.title}
                amount={
                  item.estimatedAmount === null
                    ? "Sin cotizar"
                    : formatMoney(item.estimatedAmount)
                }
                status={
                  item.publishedAt === null ? "Sin publicar" : "Visible en el sitio"
                }
              >
                <RowAction label="Editar este rubro">
                  <ActionForm action={saveBudgetItemAction}>
                    {itemFields(item)}
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
