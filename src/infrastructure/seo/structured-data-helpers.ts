import {
  articleSchema,
  breadcrumbSchema,
  donateActionSchema,
  faqSchema,
  graph,
  organizationSchema,
  personSchema,
  webPageSchema,
  webSiteSchema,
} from "./structured-data";

/**
 * Un dato estructurado es una afirmación que se le hace a una máquina en un lugar
 * donde nadie la revisa. Por eso estos tests no comprueban que el JSON-LD "esté":
 * comprueban que **no afirme nada que la página no muestre y que no esté
 * verificado**. Cada aserción de acá corresponde a una mentira concreta que se
 * podría estar contando.
 */

export const SITE = "https://ejemplo.test";

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Lo que se prueba es lo que se emite, así que todo pasa por `JSON.parse`. */
export function emit(nodes: readonly object[]): { context: unknown; nodes: unknown[] } {
  const parsed: unknown = JSON.parse(graph(nodes));

  if (!isJsonObject(parsed) || !isJsonArray(parsed["@graph"])) {
    throw new Error("El grafo emitido no tiene la forma esperada.");
  }

  return { context: parsed["@context"], nodes: parsed["@graph"] };
}

export function emitOne(node: object): Record<string, unknown> {
  const [only] = emit([node]).nodes;

  if (!isJsonObject(only)) {
    throw new Error("El nodo emitido no es un objeto.");
  }

  return only;
}

export function objectList(value: unknown): Record<string, unknown>[] {
  if (!isJsonArray(value)) {
    throw new Error("Se esperaba una lista.");
  }

  return value.map((item) => {
    if (!isJsonObject(item)) {
      throw new Error("Se esperaba una lista de objetos.");
    }

    return item;
  });
}

function walk(
  value: unknown,
  visit: (value: unknown, path: string) => void,
  path = "@graph",
): void {
  visit(value, path);

  if (isJsonArray(value)) {
    value.forEach((item, index) => {
      walk(item, visit, `${path}[${String(index)}]`);
    });

    return;
  }

  if (isJsonObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      walk(item, visit, `${path}.${key}`);
    }
  }
}

export function allKeys(value: unknown): string[] {
  const keys: string[] = [];

  walk(value, (node) => {
    if (isJsonObject(node)) {
      keys.push(...Object.keys(node));
    }
  });

  return keys;
}

/** Todos los `@type` del grafo, incluidos los de los nodos anidados. */
export function allTypes(value: unknown): string[] {
  const types: string[] = [];

  walk(value, (node) => {
    if (isJsonObject(node) && typeof node["@type"] === "string") {
      types.push(node["@type"]);
    }
  });

  return types;
}

export function allStrings(value: unknown): { text: string; path: string }[] {
  const strings: { text: string; path: string }[] = [];

  walk(value, (node, path) => {
    if (typeof node === "string") {
      strings.push({ text: node, path });
    }
  });

  return strings;
}

/**
 * Todos los nodos que el sitio llega a emitir, juntos. Las garantías genéricas se
 * verifican sobre esta lista y no nodo por nodo: un nodo nuevo entra acá y queda
 * cubierto sin que haya que acordarse de agregarle los mismos cinco tests.
 */
export function everyNode(): readonly object[] {
  return [
    organizationSchema(SITE),
    webSiteSchema(SITE),
    personSchema(SITE),
    faqSchema(),
    donateActionSchema(SITE),
    webPageSchema({
      siteUrl: SITE,
      path: "/transparencia",
      name: "En qué se usó cada peso",
      description: "Rendición de cuentas de la campaña.",
    }),
    articleSchema({
      siteUrl: SITE,
      slug: "primera-semana",
      title: "La primera semana de obra",
      description: "Qué se compró y qué falta.",
      publishedAt: "2026-09-08T00:00:00.000Z",
    }),
    articleSchema({
      siteUrl: SITE,
      slug: "borrador",
      title: "Todavía sin publicar",
      description: "Una novedad sin fecha de publicación.",
      publishedAt: null,
    }),
    breadcrumbSchema(SITE, [
      { name: "Inicio", path: "/" },
      { name: "Novedades", path: "/novedades" },
      { name: "La primera semana de obra", path: "/novedades/primera-semana" },
    ]),
  ];
}
