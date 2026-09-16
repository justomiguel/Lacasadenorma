import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, HiddenValue, SubmitButton } from "@/components/admin/form";
import { AdminHeading, Panel } from "@/components/admin/shell";
import { formatLongDate } from "@/components/design-system/dates";
import { isActivePledge } from "@/src/domain/entities/donation-pledge";
import {
  isStaffPledgeDecision,
  type StaffPledgeDecision,
} from "@/src/domain/staff-pledge-decision";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { decidePledgeAction } from "../../../actions";

/**
 * Confirmar o soltar una reserva desde el correo (ADR-051).
 *
 * El enlace no autentica y el GET no muta. Hace falta sesión con
 * `donaciones.escribir` y un POST (FR-237, FR-260).
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

  const quien = pledge.isAnonymous
    ? "quien reservó"
    : (pledge.donorDisplayName ?? pledge.contactName ?? "quien reservó");
  const activa = isActivePledge(pledge);

  return (
    <>
      <AdminHeading
        title={decision === "si" ? "Confirmar que donan" : "Soltar la reserva"}
      >
        {pledge.itemTitle}. {quien}.
      </AdminHeading>

      <Panel id="decidir" title={pledge.itemTitle}>
        {activa ? (
          <ActiveDecision
            decision={decision}
            pledgeId={pledge.id}
            userId={pledge.userId}
            what={pledge.itemTitle}
            quien={quien}
          />
        ) : (
          <p className="max-w-measure text-body text-ink">
            {pledge.status === "fulfilled"
              ? `Esta reserva ya está confirmada. Aparece como donado por ${quien}${pledge.fulfilledAt === null ? "" : ` el ${formatLongDate(pledge.fulfilledAt.slice(0, 10))}`}.`
              : "Esta reserva ya no está activa. El ítem volvió a la lista o venció."}
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

function ActiveDecision({
  decision,
  pledgeId,
  userId,
  what,
  quien,
}: {
  decision: StaffPledgeDecision;
  pledgeId: string;
  userId: string | null;
  what: string;
  quien: string;
}) {
  const yes = decision === "si";

  return (
    <>
      <p className="max-w-measure text-body text-ink">
        {yes
          ? `${quien} se ofreció a donar ${what}. Si te contactaste y van a donar, confirmalo. Aparece en Quiénes ayudaron como donado por ${quien}, con la fecha de hoy.`
          : `${quien} se ofreció a donar ${what}. Si no se concreta, soltá la reserva para que el ítem vuelva a la lista.`}
      </p>

      <div className="mt-lg">
        <ActionForm action={decidePledgeAction}>
          <HiddenValue name="id" value={pledgeId} />
          <HiddenValue name="userId" value={userId ?? ""} />
          <HiddenValue name="what" value={what} />
          <HiddenValue name="decision" value={decision} />
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
