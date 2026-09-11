import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/public/[capability]/route";
import type { BudgetItem, MilestoneRecord, PaymentMethod } from "@/src/domain/entities";
import { money } from "@/src/domain/money";

import type { DataLayer } from "../data-layer";
import { fakeLogger, fakeSupabaseLayer } from "../test-support/fake-data-layer";
import { capabilities, runCapability } from "./registry";
import type { CapabilityResult } from "./types";

/**
 * Equivalencia entre el adaptador REST y el caso de uso (amenaza A5).
 *
 * La especificación de WebMCP nombra la divergencia entre el camino de la
 * interfaz y el del agente como su vulnerabilidad propia: si el endpoint
 * calculara aunque sea un campo por su cuenta, un agente podría estar leyendo
 * cifras que la página no muestra, y nadie lo notaría hasta que las dos no
 * coincidan en público. La única defensa real es que haya un solo camino, y la
 * única forma de comprobarla es correr los dos y compararlos.
 *
 * Por eso el test llama al handler `GET` de verdad —con un `Request` y la promesa
 * de `params`, como lo llama Next— en lugar de reimplementar lo que hace.
 */

const SITE = "https://ejemplo.test";

/**
 * `getPublicDataLayer` se sustituye porque en un test no hay proyecto de Supabase
 * y la ruta tiene que poder correr también sobre el camino disponible. Sin el
 * doble, devolvería `{ source: "content-only" }`, que es un estado legítimo y que
 * igual se prueba más abajo.
 */
const capa = vi.hoisted((): { current: DataLayer } => ({
  current: { source: "content-only" },
}));

vi.mock("@/src/infrastructure/data-layer", () => ({
  getPublicDataLayer: () => capa.current,
}));

/** Los cinco recursos publicados. La lista se compara contra el registro. */
const SLUGS = [
  "campaign-status",
  "donation-methods",
  "reconstruction-progress",
  "norma-story",
  "transparency-summary",
] as const;

/** Los cuatro que leen de la base. `norma-story` sale del contenido versionado. */
const SLUGS_CON_BASE = [
  "campaign-status",
  "donation-methods",
  "reconstruction-progress",
  "transparency-summary",
] as const;

/**
 * Campos que varían entre dos llamadas por su propia definición. Se comparan por
 * forma y no por valor: exigir igualdad haría fallar el test por el paso del
 * tiempo, y borrar la aserción dejaría de verificar que el campo exista.
 */
const CAMPOS_VARIABLES = ["updatedAt"] as const;

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const CONTENT_ONLY: DataLayer = { source: "content-only" };

const hitos: MilestoneRecord[] = [
  {
    id: "m1",
    title: "Limpieza del terreno",
    description: null,
    status: "completado",
    happenedOn: "2026-08-20",
    sortOrder: 1,
  },
];

const rubros: BudgetItem[] = [
  {
    id: "b1",
    title: "Materiales",
    description: null,
    estimatedAmount: money(40_000_000, "ARS"),
    sortOrder: 1,
  },
];

const metodos: PaymentMethod[] = [
  {
    id: "p1",
    kind: "bank_transfer",
    countryCode: "AR",
    currency: "ARS",
    label: "Cuenta en pesos",
    fields: [
      { label: "CBU", value: "0000003100010000000001", copyable: true, hint: null },
    ],
    instructions: null,
    sortOrder: 1,
  },
  {
    id: "p2",
    kind: "bank_transfer",
    countryCode: "CL",
    currency: "CLP",
    label: "Cuenta en Chile",
    fields: [{ label: "RUT", value: "11111111-1", copyable: true, hint: null }],
    instructions: null,
    sortOrder: 2,
  },
];

function sembrada(): DataLayer {
  return fakeSupabaseLayer({
    received: [money(24_000_000, "ARS")],
    expenses: [
      {
        id: "e1",
        amount: money(10_000_000, "ARS"),
        spentAt: "2026-09-02",
        concept: "Chapas para el techo",
        category: "materiales",
        supplier: "Corralón del pueblo",
        budgetItemId: null,
        receiptCount: 2,
        voidedAt: null,
      },
    ],
    milestones: hitos,
    budgetItems: rubros,
    paymentMethods: metodos,
  });
}

/**
 * Una IP distinta por pedido. El límite de tasa de la ruta es real y comparte
 * estado entre casos: sin esto, el test empezaría a recibir 429 a mitad del
 * archivo y la falla no tendría nada que ver con lo que se está probando.
 */
let pedidos = 0;

function porRuta(slug: string, query = ""): Promise<Response> {
  pedidos += 1;

  const request = new Request(`${SITE}/api/public/${slug}${query}`, {
    headers: { "x-forwarded-for": `203.0.113.${String(pedidos)}` },
  });

  return GET(request, { params: Promise.resolve({ capability: slug }) });
}

function nombreDe(slug: string): string {
  return `get_${slug.replaceAll("-", "_")}`;
}

function porCasoDeUso(
  slug: string,
  input: Record<string, string> = {},
): Promise<CapabilityResult<unknown>> {
  return runCapability(nombreDe(slug), input, {
    dataLayer: capa.current,
    logger: fakeLogger(),
    siteUrl: SITE,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objeto(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error("Se esperaba un objeto JSON.");
  }

  return value;
}

/** Separa lo comparable por valor de lo que sólo se puede comparar por forma. */
function separar(value: unknown): {
  estable: Record<string, unknown>;
  variable: Record<string, unknown>;
} {
  const estable: Record<string, unknown> = {};
  const variable: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(objeto(value))) {
    if ((CAMPOS_VARIABLES as readonly string[]).includes(key)) {
      variable[key] = item;
    } else {
      estable[key] = item;
    }
  }

  return { estable, variable };
}

function salidaDe(result: CapabilityResult<unknown>): unknown {
  if (!result.ok) {
    throw new Error(
      `El caso de uso no devolvió datos: ${result.code} — ${result.message}`,
    );
  }

  return result.output;
}

beforeEach(() => {
  // La ruta resuelve el origen con `getSiteUrl()`, y `detailUrl` sale de ahí: sin
  // fijarlo, la comparación fallaría por el puerto de desarrollo.
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  capa.current = sembrada();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("el mapeo de slugs y el registro no pueden separarse", () => {
  it("los slugs publicados son exactamente los de las capacidades registradas", () => {
    const derivados = capabilities.map((capability) =>
      capability.name.replace(/^get_/, "").replaceAll("_", "-"),
    );

    // En las dos direcciones: una capacidad nueva sin endpoint falla acá, y un
    // endpoint sin capacidad detrás también. Cualquiera de las dos sería un
    // camino que existe y nadie probó.
    expect(derivados.toSorted()).toEqual([...SLUGS].toSorted());
  });

  it.each(SLUGS)("/%s resuelve a una capacidad y no a un 404", async (slug) => {
    expect((await porRuta(slug)).status).not.toBe(404);
  });
});

describe("la respuesta REST es la salida del caso de uso", () => {
  it.each(SLUGS)("/%s devuelve el mismo cuerpo que runCapability", async (slug) => {
    const response = await porRuta(slug);
    const cuerpo: unknown = await response.json();
    const salida = salidaDe(await porCasoDeUso(slug));

    expect(response.status).toBe(200);

    const ruta = separar(cuerpo);
    const caso = separar(salida);

    // Igualdad profunda campo por campo: si el endpoint agregara, renombrara o
    // recalculara uno solo, el agente estaría leyendo otra cosa que la página.
    expect(Object.keys(ruta.estable).length).toBeGreaterThan(0);
    expect(ruta.estable).toEqual(caso.estable);

    // `updatedAt` es distinto en cada llamada porque es el momento de la lectura.
    // No se compara el valor, se comprueba que esté en las dos y que sea una
    // fecha ISO: si desapareciera, quien consume no sabría de cuándo es la cifra.
    expect(Object.keys(ruta.variable)).toEqual(Object.keys(caso.variable));

    for (const [key, value] of Object.entries(ruta.variable)) {
      expect(String(value), key).toMatch(ISO_8601);
    }
  });

  it("los parámetros de consulta llegan al caso de uso como entrada", async () => {
    const response = await porRuta("donation-methods", "?country=CL");
    const cuerpo: unknown = await response.json();

    expect(response.status).toBe(200);
    // Si la ruta ignorara el parámetro, devolvería los dos países y quien
    // preguntó por Chile creería que ese es todo el listado chileno.
    expect(cuerpo).toEqual(
      salidaDe(await porCasoDeUso("donation-methods", { country: "CL" })),
    );
    expect(JSON.stringify(cuerpo)).not.toContain("0000003100010000000001");
  });

  it("pone Cache-Control cacheable cuando la respuesta es un dato", async () => {
    const cacheControl = (await porRuta("norma-story")).headers.get("Cache-Control");

    // El HTML público no depende de una consulta por visita (D1) y esta ruta
    // tampoco debería: sin caché, una difusión viral la convierte en la fuente de
    // polling de todos los agentes a la vez.
    expect(cacheControl).toMatch(/max-age=\d+/);
    expect(cacheControl).not.toContain("no-store");
  });
});

describe("errores", () => {
  it("un recurso que no existe es 404 con la forma estable de error", async () => {
    const response = await porRuta("transfer-money");
    const cuerpo: unknown = await response.json();

    expect(response.status).toBe(404);
    expect(cuerpo).toEqual({
      error: { code: "not_found", message: expect.any(String) },
    });
    // Un cliente que recibe siempre `{ error: { code, message } }` puede
    // reaccionar al código; uno que recibe una forma distinta por status, no.
    expect(objeto(objeto(cuerpo).error).message).toMatch(/no existe/i);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each(SLUGS_CON_BASE)(
    "/%s sin fuente de datos es 503, nunca 200 con ceros",
    async (slug) => {
      capa.current = CONTENT_ONLY;

      const response = await porRuta(slug);
      const cuerpo: unknown = await response.json();

      expect(response.status).toBe(503);
      expect(cuerpo).toEqual({
        error: { code: "unavailable", message: expect.any(String) },
      });
      // Un cero servido como si fuera un dato real es una mentira que el
      // consumidor no tiene forma de detectar: no hay ninguna cifra en el cuerpo.
      expect(JSON.stringify(cuerpo)).not.toMatch(/Minor|percent|:\s*0/);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    },
  );

  it("/norma-story sigue respondiendo 200 sin fuente de datos", async () => {
    capa.current = CONTENT_ONLY;

    const response = await porRuta("norma-story");

    // El contenido editorial vive en el repositorio: el sitio se puede clonar y
    // leer completo sin credenciales (SC-012), y la API acompaña eso.
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(salidaDe(await porCasoDeUso("norma-story")));
  });

  it("una entrada inválida es 400 y no se cachea", async () => {
    const response = await porRuta("donation-methods", "?country=XX");
    const cuerpo: unknown = await response.json();

    // El esquema declarado no es la frontera: la validación corre en el servidor
    // igual (amenaza A4). Cachear un 400 dejaría el error pegado al recurso.
    expect(response.status).toBe(400);
    expect(objeto(objeto(cuerpo).error).code).toBe("invalid_input");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("una clave desconocida en la consulta también es 400", async () => {
    const response = await porRuta("donation-methods", "?pais=AR");

    expect(response.status).toBe(400);
  });
});
