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
import {
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUSES,
  type MilestoneAdminRecord,
} from "@/src/domain/entities";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { saveMilestoneAction } from "./actions";

/**
 * Hitos de obra.
 *
 * Es la sección que contesta "¿en qué está la casa?" sin que nadie tenga que leer un
 * texto. Cada hito tiene tres estados y una fecha que sólo existe cuando ya pasó: un
 * hito pendiente con fecha sería una promesa, y este proyecto no publica promesas de
 * fecha.
 *
 * El orden se escribe a mano, con números de diez en diez. Es deliberadamente humilde:
 * arrastrar filas necesitaría JavaScript de aplicación y un modelo de posiciones, y lo
 * que hace falta es intercalar un hito entre dos, que con 10, 20, 30 se resuelve
 * escribiendo 15.
 */
export default async function AdminHitosPage() {
  await requirePermission("hitos.escribir");
  const scope = await getAdminScope();

  const heading = (
    <AdminHeading title="Hitos">
      El avance de la obra, paso por paso. Es lo que la página de reconstrucción muestra
      como línea de tiempo.
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
  const milestones = await gateway.milestones.listMilestones(campaign.id);

  const statusOptions = MILESTONE_STATUSES.map((status) => ({
    value: status,
    label: MILESTONE_STATUS_LABELS[status],
  }));

  /** El siguiente múltiplo de diez, para que el hito nuevo caiga al final. */
  const nextOrder =
    milestones.length === 0
      ? 10
      : Math.max(...milestones.map((milestone) => milestone.sortOrder)) + 10;

  function fields(milestone: MilestoneAdminRecord | null) {
    return (
      <>
        <HiddenValue name="campaignId" value={campaign.id} />
        {milestone === null ? null : <HiddenValue name="id" value={milestone.id} />}
        <TextField
          name="title"
          label="Qué paso es"
          required
          maxLength={140}
          placeholder="Techo nuevo colocado"
          {...defaultOf(milestone?.title)}
        />
        <div className="grid gap-lg sm:grid-cols-2">
          <SelectField
            name="status"
            label="Estado"
            required
            options={statusOptions}
            defaultValue={milestone?.status ?? "pendiente"}
          />
          <TextField
            name="happenedOn"
            label="Cuándo se terminó"
            type="date"
            hint="Sólo cuando ya pasó. Un hito pendiente no lleva fecha."
            {...defaultOf(milestone?.happenedOn)}
          />
        </div>
        <TextAreaField
          name="description"
          label="Detalle"
          rows={3}
          maxLength={500}
          hint="Una o dos oraciones. Aparece debajo del título en el sitio."
          {...defaultOf(milestone?.description)}
        />
        <TextField
          name="sortOrder"
          label="Orden"
          inputMode="numeric"
          hint="De menor a mayor. Van de diez en diez para poder intercalar."
          defaultValue={String(milestone?.sortOrder ?? nextOrder)}
        />
        <CheckboxField
          name="publish"
          label="Mostrarlo en el sitio"
          defaultChecked={milestone === null ? true : milestone.publishedAt !== null}
          hint="Sin marcar queda guardado y no aparece en la línea de tiempo pública."
        />
      </>
    );
  }

  return (
    <>
      {heading}

      <Panel
        id="nuevo"
        title="Agregar un hito"
        tone="sunk"
        description="Uno por etapa de la obra, no uno por día de trabajo."
      >
        <ActionForm action={saveMilestoneAction} resetOnSuccess>
          {fields(null)}
          <SubmitButton pendingLabel="Guardando…">Guardar hito</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel id="lista" title="La línea de tiempo">
        {milestones.length === 0 ? (
          <NoRecords>
            Todavía no hay hitos cargados. La página de reconstrucción muestra el
            presupuesto y omite la línea de tiempo hasta que exista el primero.
          </NoRecords>
        ) : (
          <RecordList>
            {milestones.map((milestone) => (
              <Record
                key={milestone.id}
                title={milestone.title}
                meta={
                  milestone.happenedOn === null
                    ? MILESTONE_STATUS_LABELS[milestone.status]
                    : `${MILESTONE_STATUS_LABELS[milestone.status]} · ${milestone.happenedOn}`
                }
                status={
                  milestone.publishedAt === null ? "Sin publicar" : "Visible en el sitio"
                }
              >
                <RowAction label="Editar este hito">
                  <ActionForm action={saveMilestoneAction}>
                    {fields(milestone)}
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
