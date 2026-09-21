import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DonorMoneyPanel,
  DonorMaterialPanel,
} from "@/components/admin/donor-ficha-forms";
import { DonorRegenerateInvite } from "@/components/admin/donor-regenerate-invite";
import { AdminHeading, Panel, SinDatos } from "@/components/admin/shell";
import { can } from "@/src/domain/permissions";
import type { AdminGateway } from "@/src/domain/ports/admin";
import { getAdminScope } from "@/src/infrastructure/admin/context";
import { requirePermission } from "@/src/infrastructure/auth/guards";
import { getSiteUrl } from "@/src/infrastructure/site-url";
import { createDonorAuth } from "@/src/infrastructure/supabase/provision-donor";

import {
  recordDonorArrivalAction,
  recordDonorContributionAction,
  regenerateInviteAction,
} from "../actions";

/**
 * La ficha de quien donó por fuera, o de cualquier cuenta del público.
 *
 * Junta el mail, el enlace para entrar, la plata atada y el material ya
 * entregado. No es un rol interno: no entra al backoffice.
 */
export default async function AdminDonantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requirePermission("donaciones.leer");
  const { id } = await params;
  const scope = await getAdminScope();
  const puedeDonaciones = can(viewer.role, "donaciones.escribir");
  const puedeFinanzas = can(viewer.role, "finanzas.escribir");
  const auth = createDonorAuth(getSiteUrl());

  if (scope.state === "sin-base") {
    return (
      <>
        <AdminHeading title="Donante">
          Cuentas del público. Habilitar una es lo que le permite reservar material.
        </AdminHeading>
        <SinDatos state="sin-base" />
      </>
    );
  }

  const account = await scope.gateway.donors.getAccount(id);

  if (account === null) {
    notFound();
  }

  const email = account.email ?? (await scope.gateway.donors.contactOf(account.userId));
  const nombre = account.displayName ?? "Sin nombre público";
  const telefono = account.contactPhone;
  const contacto = [email ?? "sin correo", telefono].filter((part) => part !== null);

  return (
    <>
      <AdminHeading
        title={nombre}
        action={
          <Link
            href="/admin/donantes"
            className="font-ui text-small text-ink-muted underline decoration-1 underline-offset-4 hover:text-ink"
          >
            Volver a donantes
          </Link>
        }
      >
        {contacto.join(" · ")}
      </AdminHeading>

      <Panel
        id="enlace"
        title="Enlace para entrar"
        description="El invite vence. Si no llega, generá otro."
      >
        {email === null ? (
          <p className="font-ui text-small text-ink-muted">
            Esta cuenta no tiene correo. No se puede armar un enlace.
          </p>
        ) : puedeDonaciones && auth !== null ? (
          <DonorRegenerateInvite
            action={regenerateInviteAction}
            userId={account.userId}
            email={email}
            phone={telefono}
          />
        ) : (
          <p className="font-ui text-small text-ink">{email}</p>
        )}
      </Panel>

      {scope.state !== "lista" ? (
        <SinDatos state={scope.state} />
      ) : (
        <FichaMovimientos
          campaignId={scope.campaign.id}
          userId={account.userId}
          displayName={account.displayName ?? ""}
          goalCurrency={scope.campaign.goalCurrency}
          gateway={scope.gateway}
          puedeFinanzas={puedeFinanzas}
          puedeDonaciones={puedeDonaciones}
        />
      )}
    </>
  );
}

async function FichaMovimientos({
  campaignId,
  userId,
  displayName,
  goalCurrency,
  gateway,
  puedeFinanzas,
  puedeDonaciones,
}: {
  campaignId: string;
  userId: string;
  displayName: string;
  goalCurrency: string;
  gateway: AdminGateway;
  puedeFinanzas: boolean;
  puedeDonaciones: boolean;
}) {
  const [contributions, pledges, items, methods] = await Promise.all([
    gateway.contributions.listContributions(campaignId),
    gateway.donations.listPledges(),
    gateway.catalog.listItems(campaignId),
    gateway.paymentMethods.listMethods(campaignId),
  ]);

  return (
    <>
      <DonorMoneyPanel
        campaignId={campaignId}
        userId={userId}
        displayName={displayName}
        goalCurrency={goalCurrency}
        contributions={contributions.filter((row) => row.userId === userId)}
        methods={methods}
        canWrite={puedeFinanzas}
        action={recordDonorContributionAction}
      />
      <DonorMaterialPanel
        userId={userId}
        displayName={displayName}
        pledges={pledges.filter((pledge) => pledge.userId === userId)}
        items={items}
        canWrite={puedeDonaciones}
        action={recordDonorArrivalAction}
      />
    </>
  );
}
