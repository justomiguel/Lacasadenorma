import Link from "next/link";

import { AdminHeading } from "@/components/admin/shell";
import { APP_ROLE_LABELS } from "@/src/domain/entities/role";
import { requireViewer } from "@/src/infrastructure/auth/guards";

/**
 * Permiso insuficiente.
 *
 * Es una pantalla y no un error porque quien llega acá no hizo nada mal: tiene sesión
 * válida y un rol que no alcanza para esa sección. Le dice qué rol tiene, para que
 * pueda pedir el que necesita, y no le dice nada de lo que hay del otro lado.
 */
export default async function SinPermisoPage() {
  const viewer = await requireViewer();

  return (
    <>
      <AdminHeading title="Esa sección no es para tu rol">
        Tu sesión está bien; lo que no alcanza son los permisos.
      </AdminHeading>

      <p className="max-w-measure font-ui text-body text-ink-muted">
        Entraste con rol de{" "}
        <strong className="text-ink">
          {viewer.role === null ? "ninguno todavía" : APP_ROLE_LABELS[viewer.role]}
        </strong>
        . Si necesitás acceso a esa parte del backoffice, pedíselo a quien administra el
        proyecto: los roles se otorgan de uno en uno y a propósito.
      </p>

      <p className="mt-lg">
        <Link href="/admin" className="text-brick underline underline-offset-2">
          Volver al tablero
        </Link>
      </p>
    </>
  );
}
