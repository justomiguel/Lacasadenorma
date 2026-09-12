import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";
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

const { faq, norma, site } = getContent("es");

/**
 * Un dato estructurado es una afirmación que se le hace a una máquina en un lugar
 * donde nadie la revisa. Por eso estos tests no comprueban que el JSON-LD "esté":
 * comprueban que **no afirme nada que la página no muestre y que no esté
 * verificado**. Cada aserción de acá corresponde a una mentira concreta que se
 * podría estar contando.
 */

const SITE = "https://ejemplo.test";

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Lo que se prueba es lo que se emite, así que todo pasa por `JSON.parse`. */
function emit(nodes: readonly object[]): { context: unknown; nodes: unknown[] } {
  const parsed: unknown = JSON.parse(graph(nodes));

  if (!isJsonObject(parsed) || !isJsonArray(parsed["@graph"])) {
    throw new Error("El grafo emitido no tiene la forma esperada.");
  }

  return { context: parsed["@context"], nodes: parsed["@graph"] };
}

function emitOne(node: object): Record<string, unknown> {
  const [only] = emit([node]).nodes;

  if (!isJsonObject(only)) {
    throw new Error("El nodo emitido no es un objeto.");
  }

  return only;
}

function objectList(value: unknown): Record<string, unknown>[] {
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

function allKeys(value: unknown): string[] {
  const keys: string[] = [];

  walk(value, (node) => {
    if (isJsonObject(node)) {
      keys.push(...Object.keys(node));
    }
  });

  return keys;
}

/** Todos los `@type` del grafo, incluidos los de los nodos anidados. */
function allTypes(value: unknown): string[] {
  const types: string[] = [];

  walk(value, (node) => {
    if (isJsonObject(node) && typeof node["@type"] === "string") {
      types.push(node["@type"]);
    }
  });

  return types;
}

function allStrings(value: unknown): { text: string; path: string }[] {
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
function everyNode(): readonly object[] {
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

describe("organizationSchema", () => {
  it("declara Organization y nunca una figura legal que no existe", () => {
    // Fundación Norma no tiene personería jurídica. `NGO` y
    // `NonprofitOrganization` afirman una: sería el mismo dato falso que la
    // página de legado se ocupa de desmentir en prosa, dicho donde nadie lo
    // revisa. Es la aserción más importante de este archivo.
    expect(emitOne(organizationSchema(SITE))["@type"]).toBe("Organization");
  });

  it("ningún nodo del sitio se declara NGO ni NonprofitOrganization", () => {
    const types = allTypes(emit(everyNode()).nodes);

    expect(types).toContain("Organization");
    expect(types).not.toContain("NGO");
    expect(types).not.toContain("NonprofitOrganization");
    expect(types).not.toContain("Corporation");
  });

  it("no publica un domicilio de la organización, porque no hay uno publicable", () => {
    const node = emitOne(organizationSchema(SITE));

    // El lugar del proyecto sí es verdadero y ayuda a que se lo encuentre por él;
    // una dirección postal de la organización, no: inventarla para completar el
    // esquema es exactamente lo que la regla prohíbe.
    expect(node).not.toHaveProperty("address");
    expect(node).toHaveProperty("areaServed");
    expect(JSON.stringify(node)).toContain(site.place.locality);
  });
});

describe("personSchema", () => {
  it("no lleva birthDate ni deathDate: no existe la clave, ni siquiera en nulo", () => {
    const node = emitOne(personSchema(SITE));

    // `content/norma.json` las tiene en nulo porque la familia no las publicó, y
    // una fecha estimada no es una fecha. Emitir la clave en nulo tampoco sirve:
    // deja el hueco a la vista para que alguien lo "complete" con un aproximado.
    expect(node).not.toHaveProperty("birthDate");
    expect(node).not.toHaveProperty("deathDate");
    expect(Object.keys(node)).not.toContain("birthDate");
    expect(Object.keys(node)).not.toContain("deathDate");
  });

  it("el contenido sigue sin fechas, así que la omisión sigue siendo la verdad", () => {
    // Si la familia algún día las publica, este test falla y obliga a decidir a
    // mano si se declaran, en lugar de que la omisión quede como residuo.
    expect(norma.bornOn).toBeNull();
    expect(norma.diedOn).toBeNull();
  });
});

describe("faqSchema", () => {
  it("emite las nueve preguntas visibles, en el orden en que se leen", () => {
    const questions = objectList(emitOne(faqSchema()).mainEntity);

    // Nueve es un requisito del proyecto (FR-001), no una casualidad del archivo.
    expect(faq).toHaveLength(9);
    expect(questions).toHaveLength(faq.length);
    expect(questions.map((question) => question.name)).toEqual(
      faq.map((entry) => entry.question),
    );
  });

  it("la respuesta es la misma prosa que se renderiza, no una versión reescrita", () => {
    const questions = objectList(emitOne(faqSchema()).mainEntity);

    // La home renderiza cada párrafo de `answer` como un `<dd>` desde este mismo
    // contenido. Dos versiones distintas de la misma respuesta —una para la
    // persona y otra para el buscador— es contenido oculto, y está prohibido.
    expect(
      questions.map((question) =>
        isJsonObject(question.acceptedAnswer) ? question.acceptedAnswer.text : null,
      ),
    ).toEqual(faq.map((entry) => entry.answer.join(" ")));
  });

  it("una respuesta de varios párrafos se une, no se recorta al primero", () => {
    const questions = objectList(emitOne(faqSchema()).mainEntity);
    const multiple = faq.filter((entry) => entry.answer.length > 1);

    // Si el `join` se cambiara por `answer[0]`, la mitad de esas respuestas
    // desaparecería del dato estructurado sin que nada más se rompa.
    expect(multiple.length).toBeGreaterThan(0);

    for (const entry of multiple) {
      const emitted = questions.find((question) => question.name === entry.question);
      const answer = emitted === undefined ? undefined : emitted.acceptedAnswer;
      const text = isJsonObject(answer) ? answer.text : undefined;

      for (const paragraph of entry.answer) {
        expect(String(text)).toContain(paragraph);
      }
    }
  });

  it("cada pregunta es Question con su Answer, que es lo que la política exige", () => {
    const questions = objectList(emitOne(faqSchema()).mainEntity);

    for (const question of questions) {
      expect(question["@type"]).toBe("Question");
      expect(
        isJsonObject(question.acceptedAnswer) && question.acceptedAnswer["@type"],
      ).toBe("Answer");
    }
  });
});

describe("donateActionSchema", () => {
  it("no declara ningún monto: no hay un aporte sugerido y no se inventa uno", () => {
    const keys = allKeys(emitOne(donateActionSchema(SITE)));

    for (const monetary of [
      "price",
      "priceCurrency",
      "priceSpecification",
      "amount",
      "minPrice",
      "maxPrice",
      "currency",
    ]) {
      expect(keys).not.toContain(monetary);
    }
  });

  it("apunta a la página de aportes, que es donde están los datos verificados", () => {
    const node = emitOne(donateActionSchema(SITE));
    const target = node.target;

    expect(isJsonObject(target) && target.urlTemplate).toBe(`${SITE}/ayudar`);
  });

  it("en inglés el DonateAction apunta a /en/ayudar", () => {
    const node = emitOne(donateActionSchema(SITE, "en"));
    const target = node.target;

    expect(isJsonObject(target) && target.urlTemplate).toBe(`${SITE}/en/ayudar`);
  });
});

describe("garantías que valen para todo el grafo", () => {
  it("ningún nodo declara reputación: no hay reseñas, calificaciones ni ofertas", () => {
    const keys = allKeys(emit(everyNode()).nodes);

    // Si el recorrido no encontrara nada, las nueve aserciones de abajo pasarían
    // sin haber mirado nada.
    expect(keys).toContain("@type");

    // Una calificación agregada o una reseña serían inventadas, y en una campaña
    // de dinero eso no es un exceso de marketing: es fraude. `offers` además
    // convertiría un aporte en una compra, que no es lo que ocurre acá.
    expect(keys).not.toContain("aggregateRating");
    expect(keys).not.toContain("review");
    expect(keys).not.toContain("reviews");
    expect(keys).not.toContain("ratingValue");
    expect(keys).not.toContain("offers");
  });

  it("ningún valor emitido es un relleno ni el rastro de una interpolación fallida", () => {
    const strings = allStrings(emit(everyNode()).nodes);

    expect(strings.length).toBeGreaterThan(everyNode().length);

    for (const { text, path } of strings) {
      // `"null"`, `"undefined"` o `"TODO"` como texto son el síntoma de un
      // `${}` sobre un dato que no existe: el JSON queda válido y la afirmación
      // queda falsa, que es el peor de los dos mundos.
      expect(text, path).not.toBe("null");
      expect(text, path).not.toBe("undefined");
      expect(text, path).not.toBe("TODO");
      expect(text, path).not.toBe("");
      expect(text, path).not.toMatch(/\b(undefined|NaN)\b/);
    }
  });

  it("una novedad sin fecha de publicación no inventa datePublished", () => {
    const sinFecha = emitOne(
      articleSchema({
        siteUrl: SITE,
        slug: "borrador",
        title: "Todavía sin publicar",
        description: "Una novedad sin fecha de publicación.",
        publishedAt: null,
      }),
    );

    expect(sinFecha).not.toHaveProperty("datePublished");
  });

  it("la URL de una novedad en inglés lleva el prefijo y el idioma del cuerpo sigue siendo castellano", () => {
    const node = emitOne(
      articleSchema({
        siteUrl: SITE,
        slug: "primera-semana",
        title: "La primera semana de obra",
        description: "Qué se compró y qué falta.",
        publishedAt: "2026-09-08T00:00:00.000Z",
        locale: "en",
      }),
    );

    expect(node.url).toBe(`${SITE}/en/novedades/primera-semana`);
    expect(node.inLanguage).toBe("es-AR");
  });
});

describe("breadcrumbSchema", () => {
  it("numera desde 1, porque schema.org cuenta desde 1 y no desde 0", () => {
    const items = objectList(
      emitOne(
        breadcrumbSchema(SITE, [
          { name: "Inicio", path: "/" },
          { name: "Novedades", path: "/novedades" },
          { name: "La primera semana", path: "/novedades/primera-semana" },
        ]),
      ).itemListElement,
    );

    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it("construye URLs absolutas y la raíz no termina en una doble barra", () => {
    const items = objectList(
      emitOne(
        breadcrumbSchema(SITE, [
          { name: "Inicio", path: "/" },
          { name: "Quién fue Norma", path: "/norma" },
        ]),
      ).itemListElement,
    );

    // `https://ejemplo.test//` es una URL distinta de `https://ejemplo.test`:
    // Google la trata como otra página y la miga deja de coincidir con la
    // canónica.
    expect(items.map((item) => item.item)).toEqual([SITE, `${SITE}/norma`]);

    for (const item of items) {
      expect(String(item.item)).toMatch(/^https:\/\//);
      expect(String(item.item).replace(/^https:\/\//, "")).not.toContain("//");
    }
  });

  it("el inglés antepone /en y la raíz no termina en una doble barra", () => {
    const items = objectList(
      emitOne(
        breadcrumbSchema(
          SITE,
          [
            { name: "Home", path: "/" },
            { name: "Who Norma was", path: "/norma" },
          ],
          "en",
        ),
      ).itemListElement,
    );

    expect(items.map((item) => item.item)).toEqual([`${SITE}/en`, `${SITE}/en/norma`]);
  });
});

describe("graph", () => {
  it("emite JSON válido con el contexto de schema.org y un @graph", () => {
    const { context, nodes } = emit([organizationSchema(SITE), webSiteSchema(SITE)]);

    // Sin `@context` no es JSON-LD, es un objeto suelto: ningún consumidor lo
    // interpreta y el bloque entero deja de existir sin ningún error visible.
    expect(context).toBe("https://schema.org");
    expect(nodes).toHaveLength(2);
  });

  it("los nodos se refieren entre sí por @id en lugar de repetirse", () => {
    const { nodes } = emit([organizationSchema(SITE), webSiteSchema(SITE)]);
    const [organization, website] = nodes;

    // Dos copias de la organización en el mismo grafo son dos entidades para el
    // consumidor, y una de las dos siempre va a quedar desactualizada.
    expect(isJsonObject(organization) && organization["@id"]).toBe(
      `${SITE}/#organizacion`,
    );
    expect(
      isJsonObject(website) &&
        isJsonObject(website.publisher) &&
        website.publisher["@id"],
    ).toBe(`${SITE}/#organizacion`);
  });
});
