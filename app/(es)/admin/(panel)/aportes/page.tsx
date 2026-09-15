import {
  ActionForm,
  CheckboxField,
  HiddenValue,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/admin/form";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import { COUNTRY_NAMES } from "@/src/domain/entities";
import { CURRENCIES } from "@/src/domain/money";
import { can } from "@/src/domain/permissions";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import {
  markReconciledAction,
  recordContributionAction,
  setPublishContributionShareAction,
} from "./actions";
import { ContributionRecords } from "./contribution-records";

/**
 * Aportes.
 *
 * El monto de cada fila vive sólo acá. Afuera, con consentimiento, puede
 * publicarse el nombre y —si el interruptor está prendido— el porcentaje sobre
 * lo que ya llegó. Nunca la cifra (FR-014, ADR-042).
 */
export default async function AdminAportesPage() {
  const viewer = await requirePermission("finanzas.leer");
  const scope = await getAdminScope();
  const puedeEscribir = can(viewer.role, "finanzas.escribir");

  const heading = (
    <AdminHeading title="Aportes">
      El monto vive sólo acá. Afuera se publica el total, y el nombre sólo si hay
      consentimiento.
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
            id="muro"
            title="Quiénes ayudaron · plata"
            description="El interruptor decide si junto al nombre se ve qué parte representa de lo que ya llegó. Apagado, sólo el nombre. El monto no se publica nunca."
          >
            <ActionForm action={setPublishContributionShareAction}>
              <HiddenValue name="campaignId" value={campaign.id} />
              <CheckboxField
                name="publishShare"
                label="Mostrar el porcentaje que representa cada aporte"
                defaultChecked={campaign.publishContributionShare}
                hint="Se calcula en la base, truncado, sobre lo ya recibido en esa moneda. Un aporte chico no muestra 0%: se omite."
              />
              <SubmitButton tone="quiet" pendingLabel="Guardando…">
                Guardar
              </SubmitButton>
            </ActionForm>
          </Panel>

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
                hint="Para cruzarlo con el resumen del banco. El nombre público va en el campo de abajo."
              />
              <TextField
                name="contributorDisplayName"
                label="Nombre para el muro"
                maxLength={80}
                hint="Sólo si esa persona eligió aparecer. Vacío significa anónimo."
              />
              <CheckboxField
                name="appearOnWall"
                label="Aparecer en Quiénes ayudaron"
                hint="El monto no se publica. El porcentaje, sólo si está prendido el interruptor de arriba."
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
        <ContributionRecords contributions={contributions} canWrite={puedeEscribir} />
      </Panel>
    </>
  );
}
