import {
  ActionForm,
  HiddenValue,
  SubmitButton,
  TextAreaField,
} from "@/components/admin/form";
import { PledgeEditFields } from "@/components/admin/pledge-edit";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { formatLongDate } from "@/components/design-system/dates";
import {
  canEditPledge,
  isActivePledge,
  isPledgePastHold,
  type AdminPledgeRecord,
} from "@/src/domain/entities/donation-pledge";
import { can } from "@/src/domain/permissions";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import {
  acceptPledgeAction,
  cancelPledgeAction,
  deleteOfferAction,
  deletePledgeAction,
  fulfillPledgeAction,
  revertPledgeAction,
  updatePledgeAction,
} from "./actions";

const STATUS_LABEL = {
  reserved: "Reservada",
  accepted: "Tomada · pendiente de entrega",
  fulfilled: "Entregada",
  cancelled: "Cancelada",
  expired: "Vencida",
} as const;

const COVER_LABEL = {
  bring: "Lo trae",
  transfer: "Transferencia",
  mercadopago: "Mercado Pago",
  paypal: "PayPal",
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
  const offers = await scope.gateway.donations.listOffers();
  const activas = pledges.filter((pledge) => isActivePledge(pledge));
  const otras = pledges.filter((pledge) => !isActivePledge(pledge));

  return (
    <>
      {heading}

      <Panel id="avisos" title={`Avisos por teléfono · ${String(offers.length)}`}>
        {offers.length === 0 ? (
          <NoRecords>Nadie dejó un teléfono todavía.</NoRecords>
        ) : (
          <RecordList>
            {offers.map((offer) => (
              <Record
                key={offer.id}
                title={offer.itemTitle}
                meta={`${offer.contactName} · ${offer.contactPhone} · ${formatLongDate(offer.createdAt.slice(0, 10))}`}
              >
                {puedeEscribir ? (
                  <RowAction label="Borrar" tone="danger">
                    <p className="mb-md font-ui text-small text-ink">
                      ¿Borrar este aviso de {offer.contactName}?
                    </p>
                    <ActionForm action={deleteOfferAction}>
                      <HiddenValue name="id" value={offer.id} />
                      <HiddenValue name="title" value={offer.itemTitle} />
                      <SubmitButton tone="danger" pendingLabel="Borrando…">
                        Borrar el aviso
                      </SubmitButton>
                    </ActionForm>
                  </RowAction>
                ) : null}
              </Record>
            ))}
          </RecordList>
        )}
      </Panel>

      <Panel id="activas" title={`En curso · ${String(activas.length)}`}>
        {activas.length === 0 ? (
          <NoRecords>No hay ninguna reserva activa.</NoRecords>
        ) : (
          <RecordList>
            {activas.map((pledge) => (
              <PledgeRow
                key={pledge.id}
                pledge={pledge}
                puedeEscribir={puedeEscribir}
                canDelete={puedeEscribir}
              />
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
              <PledgeRow
                key={pledge.id}
                pledge={pledge}
                puedeEscribir={puedeEscribir}
                canDelete={puedeEscribir}
              />
            ))}
          </RecordList>
        )}
      </Panel>
    </>
  );
}

function PledgeRow({
  pledge,
  puedeEscribir,
  canDelete = false,
}: {
  pledge: AdminPledgeRecord;
  puedeEscribir: boolean;
  canDelete?: boolean;
}) {
  const when = formatLongDate(pledge.expiresAt.slice(0, 10));
  const quien = pledge.isAnonymous
    ? "Prefirió no aparecer"
    : (pledge.donorDisplayName ?? "Sin nombre público");
  const contacto = [pledge.contactName, pledge.contactEmail, pledge.contactPhone]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(" · ");
  const retiro = pledge.pickupAddress;
  const canEdit = puedeEscribir && canEditPledge(pledge.status);
  const canAccept = puedeEscribir && pledge.status === "reserved";
  const canFulfill = puedeEscribir && pledge.status === "accepted";
  const canRelease =
    puedeEscribir && (pledge.status === "reserved" || pledge.status === "accepted");
  const canRevert = puedeEscribir && pledge.status === "fulfilled";
  const pastHold = pledge.status === "reserved" && isPledgePastHold(pledge.expiresAt);
  const estado = pastHold
    ? `${STATUS_LABEL[pledge.status]} · Pasaron 14 días`
    : STATUS_LABEL[pledge.status];

  return (
    <Record
      title={pledge.itemTitle}
      meta={`${String(pledge.quantity)} · ${COVER_LABEL[pledge.coverChannel]} · ${quien} · ${contacto.length === 0 ? "sin contacto" : contacto} · vence ${when}`}
      status={estado}
    >
      {retiro === null ? null : (
        <p className="mb-md max-w-measure font-ui text-small text-ink-muted">
          Retiro: {retiro}
        </p>
      )}
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
      {canEdit ? (
        <RowAction label="Editar esta reserva">
          <ActionForm action={updatePledgeAction}>
            <PledgeEditFields pledge={pledge} />
          </ActionForm>
        </RowAction>
      ) : null}
      {canAccept || canFulfill || canRelease ? (
        <RowAction
          label={
            canAccept
              ? "Resolver esta reserva"
              : canFulfill
                ? "Confirmar la llegada"
                : "Soltar esta donación"
          }
        >
          <div
            className={
              canAccept || canFulfill ? "grid gap-lg sm:grid-cols-2" : undefined
            }
          >
            {canAccept ? (
              <ActionForm action={acceptPledgeAction}>
                <HiddenValue name="id" value={pledge.id} />
                <HiddenValue name="userId" value={pledge.userId ?? ""} />
                <HiddenValue name="what" value={pledge.itemTitle} />
                <SubmitButton pendingLabel="Confirmando…">Sí: donan</SubmitButton>
              </ActionForm>
            ) : null}
            {canFulfill ? (
              <ActionForm action={fulfillPledgeAction}>
                <HiddenValue name="id" value={pledge.id} />
                <HiddenValue name="userId" value={pledge.userId ?? ""} />
                <HiddenValue name="what" value={pledge.itemTitle} />
                <SubmitButton pendingLabel="Confirmando…">Llegó</SubmitButton>
              </ActionForm>
            ) : null}
            {canRelease ? (
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
                <SubmitButton tone="danger" pendingLabel="Soltando…">
                  Soltar la reserva
                </SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        </RowAction>
      ) : null}
      {canRevert ? (
        <RowAction label="Revertir">
          <p className="mb-md font-ui text-small text-ink">
            Las unidades vuelven al catálogo y, si figuraba, sale de Quiénes
            ayudaron. La reserva queda cancelada acá.
          </p>
          <ActionForm action={revertPledgeAction}>
            <HiddenValue name="id" value={pledge.id} />
            <HiddenValue name="userId" value={pledge.userId ?? ""} />
            <HiddenValue name="what" value={pledge.itemTitle} />
            <HiddenValue name="title" value={pledge.itemTitle} />
            <TextAreaField
              name="reason"
              label="Motivo (optativo)"
              rows={2}
              maxLength={300}
            />
            <SubmitButton pendingLabel="Revirtiendo…">
              Revertir la donación
            </SubmitButton>
          </ActionForm>
        </RowAction>
      ) : null}
      {canDelete ? (
        <RowAction label="Borrar" tone="danger">
          <p className="mb-md font-ui text-small text-ink">
            ¿Borrar esta donación de «{pledge.itemTitle}»? Se saca del listado y
            del muro.
          </p>
          <ActionForm action={deletePledgeAction}>
            <HiddenValue name="id" value={pledge.id} />
            <HiddenValue name="title" value={pledge.itemTitle} />
            <SubmitButton tone="danger" pendingLabel="Borrando…">
              Borrar la donación
            </SubmitButton>
          </ActionForm>
        </RowAction>
      ) : null}
    </Record>
  );
}
