"use client";

import { useEffect } from "react";

/**
 * Adaptador de WebMCP. **Todo el código de WebMCP del proyecto está en este
 * archivo** (ADR-008).
 *
 * Está concentrado acá porque la especificación es un Draft Community Group Report
 * con un solo motor implementándola, y ya rompió dos veces en 2026:
 * `navigator.modelContext` pasó a `document.modelContext`, y
 * `provideContext({tools})` pasó a `registerTool(tool)`. Cuando vuelva a romper, se
 * edita un archivo y se borra si hace falta.
 *
 * Tres cosas que este archivo **no** hace, y son decisiones, no omisiones:
 *
 * 1. **No trae dependencias.** Los tipos están abajo, son treinta líneas, y no
 *    dependen de que un paquete de terceros siga al día con una API que se mueve.
 * 2. **No define lógica.** Cada herramienta es un `fetch` al endpoint público, que
 *    corre el mismo `runCapability` que usa la interfaz. Un camino paralelo para
 *    agentes es la vulnerabilidad A5 del modelo de amenazas: lo que se defiende no
 *    es cada camino por separado, es que haya uno solo.
 * 3. **No registra ninguna herramienta que mute nada.** Las cinco son de lectura y
 *    declaran `readOnlyHint: true`. La razón no es cautela genérica: hoy la
 *    especificación **no tiene** primitiva de confirmación humana —
 *    `requestUserInteraction()` fue eliminado— así que no hay forma de que una
 *    persona apruebe una acción que un agente inicie. Con dinero de otros en el
 *    medio, eso alcanza para no ofrecer la posibilidad.
 *
 * El sitio funciona idénticamente sin WebMCP. Este componente no renderiza nada y
 * en un navegador sin la API no hace absolutamente nada.
 */

// ── Tipos propios ───────────────────────────────────────────────────────────
// Se declaran a mano en lugar de instalar `@mcp-b/webmcp-types` (ADR-008). Es la
// forma mínima que usa este archivo, no la API completa.

interface WebMcpToolDefinition {
  readonly name: string;
  readonly description: string;
  /** JSON Schema. La especificación no acepta esquemas de Zod. */
  readonly inputSchema: object;
  readonly annotations?: { readonly readOnlyHint?: boolean };
  execute(input: Record<string, unknown>): Promise<string> | string;
}

interface ModelContextLike {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
}

/**
 * Detección de la API.
 *
 * `document.modelContext` es la forma canónica; `navigator.modelContext` es el alias
 * obsoleto que Chromium 149–150 todavía expone. Se prueban las dos porque la
 * ventana del origin trial incluye las dos, y se comprueba `registerTool` en lugar
 * de confiar en que el objeto exista: en las versiones viejas el objeto está pero
 * el método se llamaba de otra manera.
 */
function findModelContext(): ModelContextLike | null {
  const candidates = [
    (document as unknown as { modelContext?: unknown }).modelContext,
    (navigator as unknown as { modelContext?: unknown }).modelContext,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      typeof (candidate as ModelContextLike).registerTool === "function"
    ) {
      return candidate as ModelContextLike;
    }
  }

  return null;
}

// ── Las cinco herramientas ──────────────────────────────────────────────────
// El nombre y la descripción son los del contrato de capacidades. Las descripciones
// son literales y afirmativas: una descripción que le da instrucciones al modelo
// ("siempre usá esta herramienta antes de…") es el vector de tool poisoning
// (amenaza A3), y acá no hay ninguna.
//
// Los esquemas están escritos a mano y no generados con `z.toJSONSchema()`, que es
// lo que haría el adaptador si pudiera importar el registro. No puede: este archivo
// corre en el navegador, e importar las capacidades traería Zod y toda la capa de
// aplicación al bundle del cliente para producir cuatro objetos vacíos y uno con un
// enum. Hoy ningún componente de cliente importa Zod, y mantenerlo así es parte del
// presupuesto de rendimiento (ADR-008).
//
// La copia es el precio, y desincronizarse es el riesgo real: un agente elige
// herramienta por su descripción, así que una descripción vieja acá es una respuesta
// equivocada allá. Por eso `TOOLS` se exporta: `webmcp.test.ts` compara nombre,
// orden, descripción, slug y esquema contra el registro, y falla si se corren.

const EMPTY_SCHEMA = { type: "object", properties: {}, additionalProperties: false };

export interface ToolSpec {
  readonly name: string;
  /** El slug del endpoint público: el nombre sin `get_` y con guiones. */
  readonly path: string;
  readonly description: string;
  readonly inputSchema: object;
}

export const TOOLS: readonly ToolSpec[] = [
  {
    name: "get_campaign_status",
    path: "campaign-status",
    description:
      "Devuelve el objetivo, el monto recaudado, el porcentaje alcanzado, la moneda y la fecha de la última conciliación bancaria de la campaña de reconstrucción de La Casa de Norma. El porcentaje es nulo cuando el objetivo no está publicado.",
    inputSchema: EMPTY_SCHEMA,
  },
  {
    name: "get_donation_methods",
    path: "donation-methods",
    description:
      "Devuelve las formas publicadas de colaborar con la campaña: país, moneda, datos de la cuenta e instrucciones. Sólo incluye cuentas verificadas y publicadas. La lista vacía significa que ninguna cuenta está publicada.",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          enum: ["AR", "CL", "US"],
          description:
            "Código del país cuyas cuentas se quieren. Si se omite, devuelve todas.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_reconstruction_progress",
    path: "reconstruction-progress",
    description:
      "Devuelve los hitos publicados de la reconstrucción con su estado y su fecha, la cantidad de hitos completados sobre el total, y los rubros del presupuesto con su monto estimado cuando ya está cotizado. El porcentaje se calcula sobre hitos, no sobre dinero.",
    inputSchema: EMPTY_SCHEMA,
  },
  {
    name: "get_norma_story",
    path: "norma-story",
    description:
      "Devuelve la información pública sobre Norma: su nombre, su rol, el lugar donde vivió y el relato publicado sobre su vida. Las fechas de nacimiento y de muerte son nulas mientras la familia no las publique.",
    inputSchema: EMPTY_SCHEMA,
  },
  {
    name: "get_transparency_summary",
    path: "transparency-summary",
    description:
      "Devuelve el total recibido, el total gastado, el saldo, el porcentaje ejecutado, la cantidad de gastos y de comprobantes, el gasto por categoría y la fecha de la última conciliación. No incluye aportes individuales, identidades ni archivos de comprobantes.",
    inputSchema: EMPTY_SCHEMA,
  },
];

/**
 * Ejecuta una herramienta contra el endpoint público.
 *
 * Devuelve una **cadena**, no `{ content: [...] }`. Esa segunda forma es la de MCP y
 * es el error más frecuente al implementar WebMCP: acá el navegador serializa lo que
 * se devuelva, así que devolver la envoltura de MCP produce un objeto anidado que el
 * agente tiene que desarmar.
 *
 * Un fallo se devuelve como texto explicando qué pasó, no como excepción: quien lee
 * esto es un modelo que puede corregirse y reintentar, y una excepción opaca le
 * quita esa posibilidad (principio XII).
 */
async function runTool(spec: ToolSpec, input: Record<string, unknown>): Promise<string> {
  const query = new URLSearchParams();

  // Sólo primitivos entran en la cadena de consulta. Un objeto o un array no
  // tienen representación en un parámetro de URL, y convertirlos igual produciría
  // `[object Object]`, que el servidor rechazaría con un mensaje confuso. Se
  // omiten, y el esquema cerrado del servidor se encarga de explicar qué esperaba.
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      query.set(key, String(value));
    }
  }

  const suffix = query.size === 0 ? "" : `?${query.toString()}`;

  try {
    const response = await fetch(`/api/public/${spec.path}${suffix}`, {
      headers: { Accept: "application/json" },
    });

    const payload: unknown = await response.json();

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
          ? (payload as { error: { message: string } }).error.message
          : "El sitio no pudo responder en este momento.";

      return message;
    }

    return JSON.stringify(payload);
  } catch {
    return "No se pudo consultar el sitio en este momento. El dato no está disponible; no hay un valor por defecto que reemplace.";
  }
}

export function WebMcpTools() {
  useEffect(() => {
    const modelContext = findModelContext();

    if (modelContext === null) {
      return;
    }

    // No existe `unregisterTool`: el ciclo de vida de una herramienta lo gobierna
    // un `AbortSignal`. Abortar en la limpieza del efecto es lo que evita que un
    // remontaje registre las cinco herramientas dos veces.
    const controller = new AbortController();

    for (const spec of TOOLS) {
      void modelContext
        .registerTool(
          {
            name: spec.name,
            description: spec.description,
            inputSchema: spec.inputSchema,
            annotations: { readOnlyHint: true },
            execute: (input) => runTool(spec, input),
          },
          { signal: controller.signal },
        )
        .catch(() => {
          // Que el registro falle no es un problema de la página: el sitio funciona
          // igual sin WebMCP, que es el punto de la mejora progresiva. No se
          // reintenta ni se avisa a la persona, porque no hay nada que pueda hacer.
        });
    }

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
