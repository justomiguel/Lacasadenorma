import { defaultOf } from "@/components/admin/defaults";
import {
  ActionForm,
  CheckboxField,
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

import { createCampaignAction, saveBudgetItemAction, updateGoalAction } from "./actions";

/**
 * Objetivo y presupuesto.
 *
 * Las dos cifras más delicadas del sitio, y las dos pueden quedar vacías a propósito.
 *
 * **El objetivo es interno.** Aunque esté cargado, el sitio público no lo usa como
 * 100% (ADR-040). Vacío sigue siendo una opción legítima: sirve para priorizar
 * adentro cuando hay un número, y no inventa una meta cuando no lo hay. Borrarlo
 * es una operación, no un error.
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
      La meta de recaudación es interna: el sitio público no la muestra. Los rubros
      cotizados aparecen afuera como porcentaje de lo ya cotizado, nunca en pesos.
    </AdminHeading>
  );

  if (scope.state === "sin-base") {
    return (
      <>
        {heading}
        <SinDatos state={scope.state} />
      </>
    );
  }

  if (scope.state === "sin-campana") {
    return (
      <>
        <AdminHeading title="La campaña">
          Gastos, aportes y el catálogo se anotan sobre una campaña. Todavía no hay
          ninguna: hay que crearla para poder cargar lo que falta.
        </AdminHeading>
        <Panel
          id="crear"
          title="Crear la campaña"
          tone="sunk"
          description="Es una sola, a propósito. El relato público sigue en el contenido editorial; esto es el contenedor de las cifras."
        >
          <ActionForm action={createCampaignAction}>
            <TextField
              name="title"
              label="Cómo se llama"
              required
              maxLength={140}
              placeholder="Reconstrucción de la casa"
            />
            <TextAreaField
              name="summary"
              label="De qué se trata"
              required
              rows={3}
              maxLength={500}
              hint="Uso interno. No reemplaza la historia que está en el sitio."
            />
            <CheckboxField
              name="publish"
              label="Publicarla: el sitio empieza a mostrar las cifras que cargues"
              defaultChecked
              hint="Sin marcar queda como borrador: podés cargar igual, y el sitio público sigue omitiendo las cifras."
            />
            <SubmitButton pendingLabel="Creando…">Crear campaña</SubmitButton>
          </ActionForm>
        </Panel>
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
        description="Es un número para priorizar adentro. El sitio público no lo usa como 100%: afuera el 100% es lo que ya llegó, y el de la obra no está publicado."
      >
        <ActionForm action={updateGoalAction}>
          <HiddenValue name="campaignId" value={campaign.id} />
          <div className="grid gap-lg sm:grid-cols-2">
            <TextField
              name="amount"
              label="Objetivo"
              inputMode="decimal"
              placeholder="8.500.000"
              hint="Vacío significa “todavía no hay objetivo interno”. El sitio público igual habla en porcentajes de lo ya recibido, nunca contra este número."
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
          <Callout title="Sin objetivo interno" className="mt-lg">
            <p>
              Aunque lo cargues, el sitio público no lo publica. Hoy tampoco hay uno
              interno: sirve para vos, no para una barra contra una meta.
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
