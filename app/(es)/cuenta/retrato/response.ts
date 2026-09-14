import { getAccountDeps } from "@/src/infrastructure/accounts/context";
import { logger } from "@/src/infrastructure/logging/logger";

export const dynamic = "force-dynamic";

/**
 * El retrato propio, servido por el servidor.
 *
 * Misma forma que los comprobantes: la URL firmada se pide, se usa y se descarta.
 * Nunca llega al navegador (ADR-037).
 */
export async function ownPortraitResponse(): Promise<Response> {
  const deps = await getAccountDeps();

  if (deps.session.status !== "ready") {
    return new Response("Tu sesión venció. Volvé a ingresar.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  try {
    const file = await deps.session.port.readOwnPortraitFile();

    if (file === null) {
      return new Response("No hay foto.", {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error("No se pudo servir el retrato", { error });

    return new Response("No pudimos traer el archivo.", {
      status: 502,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
