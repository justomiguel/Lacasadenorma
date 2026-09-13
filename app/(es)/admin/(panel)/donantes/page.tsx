import {
  ActionForm,
  HiddenValue,
  SubmitButton,
  TextAreaField,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { Callout } from "@/components/design-system/callout";
import type { DonorAccountAdminRecord } from "@/src/domain/entities/donor";
import { can } from "@/src/domain/permissions";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";

import { reviewDonorAccountAction } from "./actions";

/**
 * Las cuentas del público: quién pidió entrar, y quién ya está habilitado.
 *
 * Habilitar es la operación que abre el catálogo para una persona (ADR-033).
 * Guardar y habilitar no son lo mismo: la cuenta existe desde que confirmó el
 * correo, y reservar espera esta pantalla.
 */
export default async function AdminDonantesPage() {
  const viewer = await requirePermission("donaciones.leer");
  const scope = await getAdminScope();
  const puedeEscribir = can(viewer.role, "donaciones.escribir");

  const heading = (
    <AdminHeading title="Donantes">
      Cuentas del público. Habilitar una es lo que le permite reservar material.
    </AdminHeading>
  );

  if (scope.state === "sin-base") {
    return (
      <>
        {heading}
        <SinDatos state="sin-base" />
      </>
    );
  }

  const accounts = await scope.gateway.donors.listAccounts();
  const pendientes = accounts.filter((account) => account.approvalStatus === "pending");
  const habilitadas = accounts.filter((account) => account.approvalStatus === "approved");
  const rechazadas = accounts.filter((account) => account.approvalStatus === "declined");

  return (
    <>
      {heading}

      <Callout title="Qué se decide acá">
        <p>
          Confirmar el correo no alcanza: el equipo mira el pedido y habilita o rechaza.
          El correo de contacto se lee acá, con sesión, y no viaja en el aviso que llega a
          la bandeja.
        </p>
      </Callout>

      <Panel id="pendientes" title={`Para revisar · ${pendientes.length}`}>
        {pendientes.length === 0 ? (
          <NoRecords>No hay ningún pedido esperando.</NoRecords>
        ) : (
          <RecordList>
            {pendientes.map((account) => (
              <AccountRow
                key={account.userId}
                account={account}
                canWrite={puedeEscribir}
                pending
              />
            ))}
          </RecordList>
        )}
      </Panel>

      <Panel id="habilitadas" title={`Habilitadas · ${habilitadas.length}`}>
        {habilitadas.length === 0 ? (
          <NoRecords>Todavía no hay ninguna cuenta habilitada.</NoRecords>
        ) : (
          <RecordList>
            {habilitadas.map((account) => (
              <AccountRow key={account.userId} account={account} canWrite={false} />
            ))}
          </RecordList>
        )}
      </Panel>

      <Panel id="rechazadas" title={`Rechazadas · ${rechazadas.length}`}>
        {rechazadas.length === 0 ? (
          <NoRecords>Ningún rechazo, por ahora.</NoRecords>
        ) : (
          <RecordList>
            {rechazadas.map((account) => (
              <AccountRow
                key={account.userId}
                account={account}
                canWrite={puedeEscribir}
                reconsider
              />
            ))}
          </RecordList>
        )}
      </Panel>
    </>
  );
}

function AccountRow({
  account,
  canWrite,
  pending = false,
  reconsider = false,
}: {
  account: DonorAccountAdminRecord;
  canWrite: boolean;
  pending?: boolean;
  reconsider?: boolean;
}) {
  const estado =
    account.approvalStatus === "pending"
      ? "Pendiente"
      : account.approvalStatus === "approved"
        ? "Habilitada"
        : "Rechazada";

  return (
    <Record
      title={account.displayName ?? "Sin nombre público"}
      meta={`${account.email ?? "sin correo"} · ${account.locale} · ${estado}`}
      status={estado}
    >
      {account.reviewNote === null ? null : (
        <p className="mb-md font-ui text-small text-ink-muted">{account.reviewNote}</p>
      )}

      {canWrite && (pending || reconsider) ? (
        <RowAction label={reconsider ? "Habilitarla igual" : "Decidir"} tone="quiet">
          {pending ? (
            <div className="grid gap-lg sm:grid-cols-2">
              <ActionForm action={reviewDonorAccountAction}>
                <HiddenValue name="userId" value={account.userId} />
                <HiddenValue name="locale" value={account.locale} />
                <HiddenValue name="decision" value="approved" />
                <SubmitButton pendingLabel="Habilitando…">Habilitar</SubmitButton>
              </ActionForm>
              <ActionForm action={reviewDonorAccountAction}>
                <HiddenValue name="userId" value={account.userId} />
                <HiddenValue name="locale" value={account.locale} />
                <HiddenValue name="decision" value="declined" />
                <TextAreaField
                  name="note"
                  label="Motivo, si querés dejarlo"
                  rows={2}
                  maxLength={500}
                />
                <SubmitButton tone="danger" pendingLabel="Rechazando…">
                  Rechazar
                </SubmitButton>
              </ActionForm>
            </div>
          ) : (
            <ActionForm action={reviewDonorAccountAction}>
              <HiddenValue name="userId" value={account.userId} />
              <HiddenValue name="locale" value={account.locale} />
              <HiddenValue name="decision" value="approved" />
              <SubmitButton pendingLabel="Habilitando…">Habilitarla igual</SubmitButton>
            </ActionForm>
          )}
        </RowAction>
      ) : null}
    </Record>
  );
}
