import Link from "next/link";

import {
  ActionForm,
  HiddenValue,
  SubmitButton,
  TextAreaField,
} from "@/components/admin/form";
import { DonorProvisionForm } from "@/components/admin/donor-provision-form";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import type { DonorAccountAdminRecord } from "@/src/domain/entities/donor";
import { can } from "@/src/domain/permissions";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";
import { getSiteUrl } from "@/src/infrastructure/site-url";
import { createDonorAuth } from "@/src/infrastructure/supabase/provision-donor";

import { provisionDonorAction, reviewDonorAccountAction } from "./actions";

/**
 * Las cuentas del público: quién pidió entrar, y quién ya está habilitado.
 *
 * Habilitar es la operación que abre el catálogo para una persona (ADR-033).
 * Cargar a alguien que donó por fuera crea la cuenta ya habilitada.
 */
export default async function AdminDonantesPage() {
  const viewer = await requirePermission("donaciones.leer");
  const scope = await getAdminScope();
  const puedeEscribir = can(viewer.role, "donaciones.escribir");
  const auth = createDonorAuth(getSiteUrl());

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

      {puedeEscribir && auth !== null ? (
        <Panel
          id="alta"
          title="Cargar a alguien que donó por fuera"
          tone="sunk"
          description="Nombre obligatorio. Correo y teléfono, si los hay. Sin correo se inventa uno para entrar; no se publica."
        >
          <DonorProvisionForm action={provisionDonorAction} />
        </Panel>
      ) : null}

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
              <AccountRow
                key={account.userId}
                account={account}
                canWrite={false}
                href={`/admin/donantes/${account.userId}`}
              />
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
  href,
}: {
  account: DonorAccountAdminRecord;
  canWrite: boolean;
  pending?: boolean;
  reconsider?: boolean;
  href?: string;
}) {
  const estado =
    account.approvalStatus === "pending"
      ? "Pendiente"
      : account.approvalStatus === "approved"
        ? "Habilitada"
        : "Rechazada";
  const nombre = account.displayName ?? "Sin nombre público";

  return (
    <Record
      title={
        href === undefined ? (
          nombre
        ) : (
          <Link
            href={href}
            className="underline decoration-1 underline-offset-4 hover:text-aqua-strong"
          >
            {nombre}
          </Link>
        )
      }
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
