import {
  runCapability,
  capabilities,
} from "@/src/application/agent-capabilities/registry";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { checkRateLimit, clientKey } from "@/src/infrastructure/http/rate-limit";
import { logger } from "@/src/infrastructure/logging/logger";
import { getSiteUrl } from "@/src/infrastructure/site-url";

/**
 * La API pública: una ruta que expone las cinco capacidades.
 *
 * Es un solo archivo y no cinco porque los cinco endpoints hacen exactamente lo
 * mismo —validar, ejecutar, serializar— y la única diferencia es qué capacidad
 * corren. Cinco archivos idénticos serían cinco lugares donde olvidarse del límite
 * de tasa o de la cabecera de caché.
 *
 * Esta ruta **no la usa la interfaz**. Las páginas llaman los casos de uso
 * directamente desde el servidor; este endpoint existe para el adaptador WebMCP,
 * que corre en el navegador, y para integraciones futuras. Que los dos caminos
 * terminen en el mismo `runCapability` es lo que impide que divergan (amenaza A5),
 * y hay un test que lo comprueba.
 */

/** El slug de la URL es el nombre de la capacidad sin `get_` y con guiones. */
function capabilityNameFor(slug: string): string | undefined {
  const candidate = `get_${slug.replaceAll("-", "_")}`;

  return capabilities.some((capability) => capability.name === candidate)
    ? candidate
    : undefined;
}

const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

function errorResponse(
  status: number,
  code: string,
  message: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: {
        // Un error no se cachea: si la fuente vuelve, la próxima llamada tiene que
        // verla. Cachear un 503 sesenta segundos convertiría una caída de un
        // segundo en una caída de un minuto.
        "Cache-Control": "no-store",
        ...extraHeaders,
      },
    },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ capability: string }> },
): Promise<Response> {
  const { capability: slug } = await params;
  const name = capabilityNameFor(slug);

  if (name === undefined) {
    return errorResponse(
      404,
      "not_found",
      `No existe el recurso "${slug}". Los disponibles son: ${capabilities
        .map((item) => item.name.replace(/^get_/, "").replaceAll("_", "-"))
        .join(", ")}.`,
    );
  }

  const decision = checkRateLimit(clientKey(request.headers));

  if (!decision.allowed) {
    return errorResponse(
      429,
      "rate_limited",
      "Demasiados pedidos. Esperá unos segundos y volvé a intentar.",
      {
        "Retry-After": String(decision.retryAfterSeconds),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": "0",
      },
    );
  }

  // Los parámetros de consulta son la entrada. Se pasan crudos: la validación es
  // de la capacidad, con Zod y esquema cerrado, así que un parámetro desconocido
  // se rechaza en lugar de ignorarse (amenaza A4).
  const input = Object.fromEntries(new URL(request.url).searchParams);

  const result = await runCapability(name, input, {
    dataLayer: getPublicDataLayer(),
    logger,
    siteUrl: getSiteUrl(),
  });

  if (!result.ok) {
    // `unavailable` es 503 y no 200 con ceros. Un cero devuelto como si fuera un
    // dato real es una mentira que el consumidor no tiene forma de detectar
    // (principio XII, y está en el contrato de la API).
    const status = result.code === "invalid_input" ? 400 : 503;

    return errorResponse(status, result.code, result.message);
  }

  return Response.json(result.output, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "X-RateLimit-Limit": String(decision.limit),
      "X-RateLimit-Remaining": String(decision.remaining),
    },
  });
}
