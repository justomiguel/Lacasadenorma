import { redirect } from "next/navigation";

import { NotAuthorizedError } from "@/src/domain/errors";
import { can, type Permission } from "@/src/domain/permissions";

import { logger } from "../logging/logger";
import { readViewer, type Viewer } from "./viewer";

/**
 * Las guardas del backoffice.
 *
 * Se llaman **en cada carga y en cada acción de servidor**, no una vez en el
 * layout. La razón es concreta y no es paranoia: en el App Router de Next, el
 * layout no se vuelve a ejecutar en una navegación entre páginas hermanas, y una
 * Server Action es un endpoint HTTP que se puede invocar directamente con el ID de
 * la acción, sin pasar por ninguna página. Una comprobación hecha sólo en el layout
 * protege la primera pantalla y nada más.
 *
 * Hay dos formas y hacen falta las dos:
 *
 * - `requirePermission` **redirige**. Es para páginas: quien no tiene permiso ve la
 *   pantalla de acceso o el aviso de permiso insuficiente, no un error.
 * - `assertPermission` **lanza**. Es para acciones de servidor, donde un redirect
 *   dejaría la mutación a medio camino sin decir nada. La excepción sube y la acción
 *   devuelve un error visible (principio XII).
 *
 * Ninguna de las dos es la frontera real. La frontera son las policies RLS: aunque
 * las dos fallaran, la base rechaza la escritura. Esto existe para que la interfaz
 * no ofrezca lo que la base va a negar, y para que el rechazo tenga un mensaje en
 * castellano en lugar de un código de Postgres.
 */

export async function requireViewer(): Promise<Viewer> {
  const viewer = await readViewer();

  if (viewer === null) {
    redirect("/admin/login");
  }

  return viewer;
}

export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await requireViewer();

  if (!can(viewer.role, permission)) {
    // Se registra porque un intento de acceso sin permiso es información de
    // seguridad. Se registra el permiso pedido y el rol, nunca el correo: el logger
    // lo redactaría igual, y de todos modos el dato que importa es el rol.
    logger.warn("Acceso sin permiso al backoffice", {
      permission,
      role: viewer.role,
    });

    redirect("/admin/sin-permiso");
  }

  return viewer;
}

export async function assertPermission(permission: Permission): Promise<Viewer> {
  const viewer = await readViewer();

  if (viewer === null) {
    throw new NotAuthorizedError("Tu sesión venció. Volvé a entrar.");
  }

  if (!can(viewer.role, permission)) {
    logger.warn("Acción de servidor rechazada por permisos", {
      permission,
      role: viewer.role,
    });

    throw new NotAuthorizedError("Tu rol no permite hacer esto.");
  }

  return viewer;
}
