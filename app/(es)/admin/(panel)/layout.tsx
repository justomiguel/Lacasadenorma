import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/shell";
import { requireViewer } from "@/src/infrastructure/auth/guards";

import { SignOutButton } from "./sign-out";

/**
 * El marco de todo lo que está detrás de la sesión.
 *
 * La guarda de acá **no alcanza y no pretende alcanzar**: en el App Router un layout
 * no se vuelve a ejecutar al navegar entre páginas hermanas, así que esto protege la
 * primera pantalla de la visita. Cada página vuelve a pedir su permiso, y cada acción
 * también. Tres comprobaciones para lo mismo, porque cada una cubre un agujero de la
 * anterior, y ninguna de las tres es la frontera real: la frontera son las policies.
 */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();

  return (
    <AdminShell role={viewer.role} email={viewer.email}>
      {children}
      <div className="mt-5xl border-t border-rule pt-lg">
        <SignOutButton />
      </div>
    </AdminShell>
  );
}
