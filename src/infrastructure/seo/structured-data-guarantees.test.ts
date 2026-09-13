import { describe, expect, it } from "vitest";

import {
  articleSchema,
  breadcrumbSchema,
  organizationSchema,
  webSiteSchema,
} from "./structured-data";
import {
  SITE,
  allKeys,
  allStrings,
  emit,
  emitOne,
  everyNode,
  isJsonObject,
  objectList,
} from "./structured-data-helpers";

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
