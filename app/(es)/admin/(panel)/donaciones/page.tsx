import {
  ActionForm,
  HiddenValue,
  SubmitButton,
  TextAreaField,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import { formatLongDate } from "@/components/design-system/dates";
import {
  isActivePledge,
  type AdminPledgeRecord,
} from "@/src/domain/entities/donation-pledge";
import { can } from "@/src/domain/permissions";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { cancelPledgeAction, fulfillPledgeAction } from "./actions";

const STATUS_LABEL = {
  reserved: "Reservada",
  fulfilled: "Llegó",
  cancelled: "Cancelada",
  expired: "Vencida",
} as const;

/**
 * Las reservas: confirmar que el material llegó, o cancelarlas con motivo.
 *
 * `editor` no entra. Ver el correo de contacto pide `donaciones.leer`; mover el
 * estado pide `donaciones.escribir`. Registrar una llegada no toca ningún total
 * de dinero (SC-209, ADR-031).
 */
export default async function AdminDonacionesPage() {
  const viewer = await requirePermission("donaciones.leer");
  const scope = await getAdminScope();
  const puedeEscribir = can(viewer.role, "donaciones.escribir");

  const heading = (
    <AdminHeading title="Donaciones">
      Quién se ofreció a traer qué. Confirmar la llegada mueve el contador; no suma plata.
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

  const pledges = await scope.gateway.donations.listPledges();
  const activas = pledges.filter((pledge) => isActivePledge(pledge));
  const otras = pledges.filter((pledge) => !isActivePledge(pledge));

  return (
    <>
      {heading}

      <Callout title="Qué se decide acá">
        <p>
          Una reserva no es una donación hasta que el material llega. Confirmarla saca las
          unidades del listado de lo que falta. Cancelarla las devuelve. El motivo de una
          cancelación ajena queda en el rastro.
        </p>
      </Callout>

      <Panel id="activas" title={`En curso · ${String(activas.length)}`}>
        {activas.length === 0 ? (
          <NoRecords>No hay ninguna reserva activa.</NoRecords>
        ) : (
          <RecordList>
            {activas.map((pledge) => (
              <PledgeRow key={pledge.id} pledge={pledge} canWrite={puedeEscribir} />
            ))}
          </RecordList>
        )}
      </Panel>

      <Panel id="otras" title={`Cerradas · ${String(otras.length)}`}>
        {otras.length === 0 ? (
          <NoRecords>Todavía no se entregó ni se canceló ninguna.</NoRecords>
        ) : (
          <RecordList>
            {otras.map((pledge) => (
              <PledgeRow key={pledge.id} pledge={pledge} canWrite={false} />
            ))}
          </RecordList>
        )}
      </Panel>
    </>
  );
}

function PledgeRow({
  pledge,
  canWrite,
}: {
  pledge: AdminPledgeRecord;
  canWrite: boolean;
}) {
  const when = formatLongDate(pledge.expiresAt.slice(0, 10));
  const quien = pledge.isAnonymous
    ? "Prefirió no aparecer"
    : (pledge.donorDisplayName ?? "Sin nombre público");
  const contacto = pledge.contactEmail ?? "sin correo";

  return (
    <Record
      title={pledge.itemTitle}
      meta={`${String(pledge.quantity)} · ${quien} · ${contacto} · vence ${when}`}
      status={STATUS_LABEL[pledge.status]}
    >
      {pledge.donorNote === null ? null : (
        <p className="mb-md max-w-measure font-ui text-small text-ink-muted">
          {pledge.donorNote}
        </p>
      )}
      {pledge.cancelReason === null ? null : (
        <p className="mb-md max-w-measure font-ui text-small text-ink-muted">
          Motivo: {pledge.cancelReason}
        </p>
      )}
      {canWrite ? (
        <RowAction label="Resolver esta reserva">
          <div className="grid gap-lg sm:grid-cols-2">
            <ActionForm action={fulfillPledgeAction}>
              <HiddenValue name="id" value={pledge.id} />
              <HiddenValue name="userId" value={pledge.userId ?? ""} />
              <HiddenValue name="what" value={pledge.itemTitle} />
              <SubmitButton pendingLabel="Confirmando…">Llegó</SubmitButton>
            </ActionForm>
            <ActionForm action={cancelPledgeAction}>
              <HiddenValue name="id" value={pledge.id} />
              <HiddenValue name="userId" value={pledge.userId ?? ""} />
              <HiddenValue name="what" value={pledge.itemTitle} />
              <TextAreaField
                name="reason"
                label="Motivo de la cancelación"
                required
                rows={2}
                maxLength={300}
              />
              <SubmitButton tone="danger" pendingLabel="Cancelando…">
                Cancelar la reserva
              </SubmitButton>
            </ActionForm>
          </div>
        </RowAction>
      ) : null}
    </Record>
  );
}
