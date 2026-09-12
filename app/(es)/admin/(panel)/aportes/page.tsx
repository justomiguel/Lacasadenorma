import {
  ActionForm,
  HiddenValue,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import { COUNTRY_NAMES } from "@/src/domain/entities";
import { CURRENCIES, formatMoney } from "@/src/domain/money";
import { can } from "@/src/domain/permissions";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import {
  markReconciledAction,
  recordContributionAction,
  voidContributionAction,
} from "./actions";

/**
 * Aportes.
 *
 * Lo que se registra acá **no se publica individualmente, nunca**. El sitio muestra el
 * total, y esta pantalla es el único lugar del sistema donde el detalle se ve. La razón
 * está en FR-014: en un pueblo donde todos se conocen, "medio millón el 3 de
 * septiembre" alcanza para saber quién fue.
 *
 * Por eso el formulario no tiene un campo de nombre. Tiene una nota de conciliación,
 * que es lo que hace falta para cruzar la fila con el resumen del banco, y está pensada
 * para escribir "transferencia 0912-4471", no "la tía Marta".
 */
export default async function AdminAportesPage() {
  const viewer = await requirePermission("finanzas.leer");
  const scope = await getAdminScope();
  const puedeEscribir = can(viewer.role, "finanzas.escribir");

  const heading = (
    <AdminHeading title="Aportes">
      El detalle vive sólo acá. Afuera se publica el total, nunca quién aportó.
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

  const [contributions, methods] = await Promise.all([
    gateway.contributions.listContributions(campaign.id),
    gateway.paymentMethods.listMethods(campaign.id),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      {heading}

      {puedeEscribir ? (
        <>
          <Panel
            id="nuevo"
            title="Registrar un aporte"
            tone="sunk"
            description="Uno por movimiento del resumen bancario, con la fecha en la que entró."
          >
            <ActionForm action={recordContributionAction} resetOnSuccess>
              <HiddenValue name="campaignId" value={campaign.id} />
              <div className="grid gap-lg sm:grid-cols-2">
                <TextField
                  name="amount"
                  label="Monto"
                  required
                  inputMode="decimal"
                  placeholder="500.000"
                  hint="Punto para los miles, coma para los centavos."
                />
                <SelectField
                  name="currency"
                  label="Moneda"
                  required
                  defaultValue={campaign.goalCurrency}
                  options={CURRENCIES.map((code) => ({ value: code, label: code }))}
                />
                <TextField
                  name="receivedAt"
                  label="Fecha en que entró"
                  type="date"
                  required
                />
                {methods.length === 0 ? null : (
                  <SelectField
                    name="paymentMethodId"
                    label="Por qué cuenta entró"
                    options={[
                      { value: "", label: "Sin especificar" },
                      ...methods.map((method) => ({
                        value: method.id,
                        label: `${COUNTRY_NAMES[method.countryCode]} · ${method.label}`,
                      })),
                    ]}
                  />
                )}
              </div>
              <TextField
                name="sourceNote"
                label="Nota de conciliación"
                maxLength={200}
                placeholder="Transferencia 0912-4471"
                hint="Para poder cruzarlo con el resumen del banco. No pongas el nombre de quien aportó."
              />
              <SubmitButton pendingLabel="Registrando…">Registrar aporte</SubmitButton>
            </ActionForm>
          </Panel>

          <Panel
            id="conciliacion"
            title="Conciliación bancaria"
            description="La fecha que se marca acá es la que el sitio publica. Si tiene más de treinta días, la página de transparencia lo avisa sola."
          >
            <ActionForm action={markReconciledAction}>
              <HiddenValue name="campaignId" value={campaign.id} />
              <TextField
                name="reconciledAt"
                label="Revisado hasta"
                type="date"
                required
                defaultValue={hoy}
                hint={
                  campaign.reconciledAt === null
                    ? "Nunca se marcó una conciliación."
                    : `Última vez: ${campaign.reconciledAt.slice(0, 10)}.`
                }
              />
              <SubmitButton tone="quiet" pendingLabel="Guardando…">
                Marcar conciliación
              </SubmitButton>
            </ActionForm>
          </Panel>
        </>
      ) : (
        <Callout title="Sólo lectura">
          <p>
            Tu rol puede ver el detalle de los aportes y no puede registrar, anular ni
            conciliar.
          </p>
        </Callout>
      )}

      <Panel id="lista" title="Movimientos registrados">
        {contributions.length === 0 ? (
          <NoRecords>
            Todavía no hay aportes registrados. El total público va a mostrar el aviso
            correspondiente en lugar de un cero.
          </NoRecords>
        ) : (
          <RecordList>
            {contributions.map((contribution) => {
              const anulado = contribution.voidedAt !== null;

              return (
                <Record
                  key={contribution.id}
                  title={contribution.sourceNote ?? "Sin nota de conciliación"}
                  amount={formatMoney(contribution.amount)}
                  muted={anulado}
                  meta={contribution.receivedAt}
                  status={
                    anulado
                      ? `Anulado: ${contribution.voidReason ?? "sin motivo registrado"}`
                      : "Suma en el total público"
                  }
                >
                  {anulado || !puedeEscribir ? null : (
                    <RowAction label="Anular este aporte" tone="danger">
                      <ActionForm action={voidContributionAction}>
                        <HiddenValue name="id" value={contribution.id} />
                        <TextAreaField
                          name="reason"
                          label="Por qué se anula"
                          required
                          rows={3}
                          hint="Por ejemplo: el banco rechazó la transferencia. Queda registrado junto al aporte."
                        />
                        <SubmitButton tone="danger" pendingLabel="Anulando…">
                          Anular aporte
                        </SubmitButton>
                      </ActionForm>
                    </RowAction>
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
