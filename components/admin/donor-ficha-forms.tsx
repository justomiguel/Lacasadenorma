import {
  ActionForm,
  CheckboxField,
  HiddenValue,
  SelectField,
  SubmitButton,
  TextField,
  type ActionState,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList } from "@/components/admin/records";
import { Panel } from "@/components/admin/shell";
import { COUNTRY_NAMES } from "@/src/domain/entities";
import type { ContributionAdminRecord } from "@/src/domain/entities/contribution";
import type { DonationItemAdminRecord } from "@/src/domain/entities/donation-item";
import { DONATION_UNIT_LABELS } from "@/src/domain/entities/donation-item";
import type { AdminPledgeRecord } from "@/src/domain/entities/donation-pledge";
import type { PaymentMethodAdminRecord } from "@/src/domain/entities/payment-method";
import { formatMoney, CURRENCIES } from "@/src/domain/money";

const PLEDGE_STATUS_LABEL = {
  reserved: "Reservada",
  accepted: "Tomada · pendiente de entrega",
  fulfilled: "Entregada",
  cancelled: "Cancelada",
  expired: "Vencida",
} as const;

export function DonorMoneyPanel({
  campaignId,
  userId,
  displayName,
  goalCurrency,
  contributions,
  methods,
  canWrite,
  action,
}: {
  campaignId: string;
  userId: string;
  displayName: string;
  goalCurrency: string;
  contributions: readonly ContributionAdminRecord[];
  methods: readonly PaymentMethodAdminRecord[];
  canWrite: boolean;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  return (
    <Panel
      id="plata"
      title="Plata"
      description="El monto vive sólo acá. En el muro, el nombre y —si hay consentimiento— el porcentaje. Nunca la cifra."
    >
      {contributions.length === 0 ? (
        <NoRecords>Todavía no hay aportes atados a esta persona.</NoRecords>
      ) : (
        <RecordList>
          {contributions.map((contribution) => (
            <Record
              key={contribution.id}
              title={contribution.sourceNote ?? "Sin nota de conciliación"}
              amount={formatMoney(contribution.amount)}
              muted={contribution.voidedAt !== null}
              meta={contribution.receivedAt}
              status={
                contribution.voidedAt !== null
                  ? `Anulado: ${contribution.voidReason ?? "sin motivo registrado"}`
                  : !contribution.isAnonymous &&
                      contribution.contributorDisplayName !== null
                    ? `En el muro como ${contribution.contributorDisplayName}`
                    : "No aparece en el muro"
              }
            />
          ))}
        </RecordList>
      )}

      {canWrite ? (
        <div className="mt-lg">
          <ActionForm action={action} resetOnSuccess>
            <HiddenValue name="campaignId" value={campaignId} />
            <HiddenValue name="userId" value={userId} />
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
                defaultValue={goalCurrency}
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
              hint="Para cruzarlo con el resumen del banco. El nombre público va en el campo de abajo."
            />
            <TextField
              name="contributorDisplayName"
              label="Nombre para el muro"
              maxLength={80}
              defaultValue={displayName}
              hint="Sólo si esa persona eligió aparecer. Vacío significa anónimo."
            />
            <CheckboxField
              name="appearOnWall"
              label="Aparecer en Quiénes ayudaron"
              hint="El monto no se publica."
            />
            <SubmitButton pendingLabel="Registrando…">Registrar aporte</SubmitButton>
          </ActionForm>
        </div>
      ) : null}
    </Panel>
  );
}

export function DonorMaterialPanel({
  userId,
  displayName,
  pledges,
  items,
  canWrite,
  action,
}: {
  userId: string;
  displayName: string;
  pledges: readonly AdminPledgeRecord[];
  items: readonly DonationItemAdminRecord[];
  canWrite: boolean;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const available = items.filter((item) => item.remainingQuantity > 0);

  return (
    <Panel
      id="material"
      title="Material"
      description="Lo que ya llegó, anotado como entregado. Si no está en el catálogo, primero se carga el ítem."
    >
      {pledges.length === 0 ? (
        <NoRecords>Todavía no hay material anotado a esta persona.</NoRecords>
      ) : (
        <RecordList>
          {pledges.map((pledge) => (
            <Record
              key={pledge.id}
              title={pledge.itemTitle}
              meta={String(pledge.quantity)}
              status={PLEDGE_STATUS_LABEL[pledge.status]}
            />
          ))}
        </RecordList>
      )}

      {canWrite && available.length > 0 ? (
        <div className="mt-lg">
          <ActionForm action={action} resetOnSuccess>
            <HiddenValue name="userId" value={userId} />
            <SelectField
              name="itemId"
              label="Ítem"
              required
              options={[
                { value: "", label: "Elegí un ítem" },
                ...available.map((item) => ({
                  value: item.id,
                  label: `${item.title} · quedan ${String(item.remainingQuantity)} ${DONATION_UNIT_LABELS[item.unit]}`,
                })),
              ]}
            />
            <TextField name="quantity" label="Cantidad" required inputMode="numeric" />
            <TextField
              name="displayName"
              label="Nombre para el muro"
              maxLength={80}
              defaultValue={displayName}
              hint="Vacío significa anónimo."
            />
            <CheckboxField name="appearOnWall" label="Aparecer en Quiénes ayudaron" />
            <SubmitButton pendingLabel="Anotando…">Anotar la entrega</SubmitButton>
          </ActionForm>
        </div>
      ) : null}

      {canWrite && available.length === 0 ? (
        <p className="mt-lg font-ui text-small text-ink-muted">
          No hay ítems con cupo. Cargalos en Catálogo y después atribuidos acá.
        </p>
      ) : null}
    </Panel>
  );
}
