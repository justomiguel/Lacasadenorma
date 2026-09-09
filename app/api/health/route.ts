import { getPublicDataLayer } from "@/src/infrastructure/data-layer";

/**
 * Diagnóstico de despliegue.
 *
 * El campo que importa es `dataSource`. Un despliegue puede levantar
 * perfectamente, responder 200 en todas las páginas y no ver la base: en ese caso
 * el sitio muestra el contenido editorial con las cifras omitidas, que es
 * exactamente lo que tiene que hacer (FR-034), y desde afuera se ve igual de sano.
 * Este endpoint es la forma de distinguir "no hay cifras porque todavía no se
 * cargaron" de "no hay cifras porque falta una variable de entorno", sin entrar al
 * panel de nadie.
 *
 * No expone configuración: dice de qué **clase** es la fuente, no cuál es. Ni URL,
 * ni claves, ni nombres de tablas (amenaza I6).
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const dataLayer = getPublicDataLayer();

  return Response.json(
    {
      status: "ok",
      // El SHA lo inyecta Vercel. En local no existe, y decirlo es más útil que
      // inventar un valor.
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      dataSource: dataLayer.source,
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
