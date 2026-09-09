import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * El backoffice no se indexa. Nunca.
 *
 * `robots.ts` ya lo excluye del rastreo, pero eso es una convención que un rastreador
 * puede ignorar; esta cabecera es una instrucción que además viaja en cada respuesta.
 * Ninguna de las dos es seguridad —la seguridad son las guardas y las policies— pero
 * un `/admin/gastos` en los resultados de búsqueda sería una invitación a probar
 * contraseñas.
 *
 * Este layout no tiene guarda: `/admin/login` vive abajo de él y una guarda acá
 * mandaría a esa pantalla a redirigirse a sí misma. La guarda está en el layout del
 * grupo `(panel)`, que envuelve todo lo demás.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
