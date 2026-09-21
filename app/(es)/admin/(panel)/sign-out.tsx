"use client";

import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import { LeaveIcon } from "@/components/design-system/icons";
import { PendingTextButton } from "@/components/design-system/pending-submit";
import { sidebarSignOutClass } from "@/components/design-system/work-sidebar";

import { signOut } from "../login/actions";

/**
 * Cerrar sesión es un formulario, no un enlace.
 *
 * Un enlace `GET` que cierra sesión se puede disparar desde una imagen en otro sitio,
 * y aunque el daño sea menor —quedarse afuera— es el mismo error de forma que hace que
 * una operación con efecto viaje en un método sin efecto. Con un `POST`, Next agrega
 * su propia protección de origen a la acción.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <PendingTextButton
        pendingLabel="Cerrando…"
        className={sidebarSignOutClass()}
        icon={
          <IdentifyingMark>
            <LeaveIcon />
          </IdentifyingMark>
        }
      >
        Cerrar sesión
      </PendingTextButton>
    </form>
  );
}
