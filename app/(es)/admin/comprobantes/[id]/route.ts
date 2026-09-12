import { openReceipt } from "@/src/application/admin";
import { getAdminDeps } from "@/src/infrastructure/admin/context";
import { logger } from "@/src/infrastructure/logging/logger";

/**
 * Un comprobante, servido por el servidor.
 *
 * Existe para que la URL firmada de Supabase **no llegue nunca al navegador**. Una URL
 * firmada es una credencial: si se entrega al cliente queda en el historial, en el
 * `Referer` de lo que se abra después y en el log de cualquier intermediario, y sigue
 * sirviendo hasta que expire. Acá el servidor la pide, la usa y la descarta.
 *
 * Tres cabeceras hacen el resto del trabajo:
 *
 * - `Cache-Control: private, no-store` para que ni el navegador ni un CDN guarden una
 *   factura ajena.
 * - `Content-Disposition: inline` con el nombre original, para que se vea en el
 *   navegador y se pueda guardar con un nombre que signifique algo.
 * - `X-Content-Type-Options: nosniff`, que ya viene del `next.config.ts` global pero se
 *   repite acá porque este es el único endpoint que devuelve un archivo subido por una
 *   persona, y es donde una mala interpretación de tipo se convertiría en ejecución.
 *
 * El permiso, la búsqueda y el registro en auditoría los hace el caso de uso. Este
 * archivo sólo traduce su resultado a códigos HTTP.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const deps = await getAdminDeps();

  if (deps === null) {
    return new Response("El backoffice no está configurado.", { status: 503 });
  }

  const result = await openReceipt(deps, { id });

  if (result.status === "rejected") {
    return new Response(result.message, { status: 403 });
  }

  if (result.status !== "ok") {
    // Un comprobante inexistente y uno que la policy no deja leer son
    // indistinguibles desde acá, y contestar lo mismo en los dos casos es lo correcto:
    // la diferencia le diría a alguien sin permiso que el archivo existe.
    return new Response("Ese comprobante no existe o no lo podés ver.", { status: 404 });
  }

  const file = await fetch(result.value.url);

  if (!file.ok || file.body === null) {
    logger.error("No se pudo descargar un comprobante ya firmado", {
      status: file.status,
    });

    return new Response("No pudimos traer el archivo.", { status: 502 });
  }

  return new Response(file.body, {
    headers: {
      "Content-Type": result.value.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(result.value.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
