import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ActionForm,
  CheckboxField,
  HiddenValue,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { AdminHeading, Panel } from "@/components/admin/shell";
import { formatLongDate } from "@/components/design-system/dates";
import {
  isStaffPledgeDecision,
  type StaffPledgeDecision,
} from "@/src/domain/staff-pledge-decision";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { cancelPledgeAction, decidePledgeAction } from "../../../actions";

/**
 * Confirmar o soltar una reserva desde el correo (ADR-051).
 *
 * El enlace no autentica y el GET no muta. Hace falta sesión con
 * `donaciones.escribir` y un POST (FR-237, FR-260). En el camino del
 * teléfono, el sí es la segunda pantalla: aparecer y la nota, si aceptaron.
 */
export default async function DecidirReservaPage({
  params,
}: {
  params: Promise<{ id: string; decision: string }>;
}) {
  await requirePermission("donaciones.escribir");

  const { id, decision: raw } = await params;

  if (!isStaffPledgeDecision(raw)) {
    notFound();
  }

  const decision: StaffPledgeDecision = raw;
  const scope = await getAdminScope();

  if (scope.state !== "lista") {
    notFound();
  }

  const pledges = await scope.gateway.donations.listPledges();
  const pledge = pledges.find((row) => row.id === id);

  if (pledge === undefined) {
    notFound();
  }

  const quien = pledge.contactName ?? pledge.donorDisplayName ?? "quien reservó";
  const reservada = pledge.status === "reserved";
  const porTelefono = pledge.userId === null;

  return (
    <>
      <AdminHeading
        title={
          pledge.status === "accepted" && decision === "si"
            ? "Ya está tomada"
            : pledge.status === "accepted" || pledge.status === "fulfilled"
              ? "Soltar la reserva"
              : decision === "si"
                ? "Confirmar que donan"
                : "Soltar la reserva"
        }
      >
        {pledge.itemTitle}. {quien}.
      </AdminHeading>

      <Panel id="decidir" title={pledge.itemTitle}>
        {reservada ? (
          <ActiveDecision
            decision={decision}
            pledgeId={pledge.id}
            userId={pledge.userId}
            what={pledge.itemTitle}
            quien={quien}
            porTelefono={porTelefono}
          />
        ) : pledge.status === "accepted" && decision === "si" ? (
          <p className="max-w-measure text-body text-ink">
            Esta reserva ya está tomada, pendiente de entrega. La llegada se
            confirma en el panel de donaciones.
          </p>
        ) : pledge.status === "accepted" ? (
          <ReleaseAccepted
            pledgeId={pledge.id}
            userId={pledge.userId}
            what={pledge.itemTitle}
          />
        ) : pledge.status === "fulfilled" ? (
          <ReleaseFulfilled
            pledgeId={pledge.id}
            userId={pledge.userId}
            what={pledge.itemTitle}
            displayName={pledge.donorDisplayName}
            fulfilledAt={pledge.fulfilledAt}
          />
        ) : (
          <p className="max-w-measure text-body text-ink">
            {alreadyDecided(pledge.status, pledge.donorDisplayName, pledge.fulfilledAt)}
          </p>
        )}

        <p className="mt-lg font-ui text-small text-ink-muted">
          <Link
            href="/admin/donaciones"
            className="text-forest underline underline-offset-2"
          >
            Volver a donaciones
          </Link>
        </p>
      </Panel>
    </>
  );
}

function ReleaseAccepted({
  pledgeId,
  userId,
  what,
}: {
  pledgeId: string;
  userId: string | null;
  what: string;
}) {
  return (
    <>
      <p className="max-w-measure text-body text-ink">
        Esta reserva ya está tomada, pendiente de entrega. Si no se concreta,
        soltala: el ítem vuelve a la lista.
      </p>
      <div className="mt-lg">
        <ActionForm action={cancelPledgeAction}>
          <HiddenValue name="id" value={pledgeId} />
          <HiddenValue name="userId" value={userId ?? ""} />
          <HiddenValue name="what" value={what} />
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
      </div>
    </>
  );
}

function ReleaseFulfilled({
  pledgeId,
  userId,
  what,
  displayName,
  fulfilledAt,
}: {
  pledgeId: string;
  userId: string | null;
  what: string;
  displayName: string | null;
  fulfilledAt: string | null;
}) {
  return (
    <>
      <p className="max-w-measure text-body text-ink">
        {alreadyDecided("fulfilled", displayName, fulfilledAt)} Si te arrepentís,
        soltala: el ítem vuelve a la lista.
      </p>
      <div className="mt-lg">
        <ActionForm action={cancelPledgeAction}>
          <HiddenValue name="id" value={pledgeId} />
          <HiddenValue name="userId" value={userId ?? ""} />
          <HiddenValue name="what" value={what} />
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
      </div>
    </>
  );
}

function alreadyDecided(
  status: string,
  displayName: string | null,
  fulfilledAt: string | null,
): string {
  if (status !== "fulfilled") {
    return "Esta reserva ya no está activa. El ítem volvió a la lista o venció.";
  }

  const cuando =
    fulfilledAt === null ? "" : ` el ${formatLongDate(fulfilledAt.slice(0, 10))}`;

  if (displayName === null) {
    return `Esta reserva ya está confirmada. Se cuenta sin nombre público${cuando}.`;
  }

  return `Esta reserva ya está confirmada. Aparece como donado por ${displayName}${cuando}.`;
}

function ActiveDecision({
  decision,
  pledgeId,
  userId,
  what,
  quien,
  porTelefono,
}: {
  decision: StaffPledgeDecision;
  pledgeId: string;
  userId: string | null;
  what: string;
  quien: string;
  porTelefono: boolean;
}) {
  const yes = decision === "si";
  const pedirApariencia = yes && porTelefono;

  return (
    <>
      <p className="max-w-measure text-body text-ink">
        {yes
          ? pedirApariencia
            ? `${quien} se ofreció a donar ${what}. Si te contactaste y van a donar, confirmalo. Si aceptó aparecer, cargá el nombre. Si no, se cuenta sin publicarlo.`
            : `${quien} se ofreció a donar ${what}. Si te contactaste y van a donar, confirmalo. Cómo aparece se elige en su cuenta.`
          : `${quien} se ofreció a donar ${what}. Si no se concreta, soltá la reserva para que el ítem vuelva a la lista.`}
      </p>

      <div className="mt-lg">
        <ActionForm action={decidePledgeAction}>
          <HiddenValue name="id" value={pledgeId} />
          <HiddenValue name="userId" value={userId ?? ""} />
          <HiddenValue name="what" value={what} />
          <HiddenValue name="decision" value={decision} />
          {pedirApariencia ? <PhoneAppearanceFields /> : null}
          <SubmitButton
            tone={yes ? "primary" : "danger"}
            pendingLabel={yes ? "Confirmando…" : "Soltando…"}
          >
            {yes ? "Sí: donan" : "No: soltar la reserva"}
          </SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}

function PhoneAppearanceFields() {
  return (
    <>
      <CheckboxField
        name="aparecer"
        label="Aceptó aparecer con nombre"
        hint="Sólo si lo dijo. El nombre de contacto no se publica solo."
      />
      <TextField
        name="nombre"
        label="Nombre para mostrar"
        hint="Cómo aparece en Quiénes ayudaron. Vacío si no aceptó."
        required={false}
      />
      <TextAreaField
        name="nota"
        label="Nota para la familia"
        hint="Opcional. No se publica. Si aceptó dejarla."
        required={false}
        rows={3}
        maxLength={500}
      />
    </>
  );
}
