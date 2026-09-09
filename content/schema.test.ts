import { describe, expect, it } from "vitest";

import { faq, help, legacy, legal, norma, riachoConecta, site, transparency } from "./index";
import { parseContent, personSchema, siteSchema } from "./schema";

describe("parseContent", () => {
  it("falla nombrando el archivo y el campo cuando falta un dato", () => {
    expect(() => parseContent(siteSchema, { name: "La Casa de Norma" }, "site.json")).toThrow(
      /content\/site\.json/,
    );
    expect(() => parseContent(siteSchema, { name: "La Casa de Norma" }, "site.json")).toThrow(
      /tagline/,
    );
  });

  it("rechaza una fecha que no tiene el formato esperado", () => {
    expect(() =>
      parseContent(
        personSchema,
        { ...norma, bornOn: "12 de marzo de 1960" },
        "norma.json",
      ),
    ).toThrow(/bornOn/);
  });

  it("acepta fechas nulas: son los datos que la familia todavía no publicó", () => {
    expect(() =>
      parseContent(personSchema, { ...norma, bornOn: null, diedOn: null }, "norma.json"),
    ).not.toThrow();
  });
});

describe("contenido publicado", () => {
  it("valida al importarse, así que un error rompe el build y no la página", () => {
    expect(site.name).toBe("La Casa de Norma");
    expect(site.tagline).toBe("Reconstruimos una casa. Construimos un legado.");
  });

  it("responde las nueve preguntas del proyecto (FR-001)", () => {
    expect(faq).toHaveLength(9);

    for (const entry of faq) {
      expect(entry.question.endsWith("?")).toBe(true);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  it("no afirma que Fundación Norma sea una organización constituida (SC de US5)", () => {
    const legacyText = [legacy.lead, ...legacy.paragraphs].join(" ").toLowerCase();

    expect(legacyText).toContain("todavía no existe como organización");
  });

  it("no publica fechas de Norma que la familia no confirmó", () => {
    expect(norma.bornOn).toBeNull();
    expect(norma.diedOn).toBeNull();
  });

  it("no contiene lenguaje de campaña de los que la constitución prohíbe", () => {
    const prohibidas = [
      "juntos podemos",
      "transformando vidas",
      "construyendo un futuro mejor",
      "empoderar comunidades",
      "hacer la diferencia",
      "empowering",
    ];

    const todo = JSON.stringify([
      site,
      norma,
      help,
      transparency,
      legacy,
      riachoConecta,
      faq,
      legal,
    ]).toLowerCase();

    for (const frase of prohibidas) {
      expect(todo).not.toContain(frase);
    }
  });

  it("no contiene marcadores de relleno ni datos de ejemplo", () => {
    const contenido = JSON.stringify([
      site,
      norma,
      help,
      transparency,
      legacy,
      riachoConecta,
      faq,
      legal,
    ]);

    // La comparación distingue mayúsculas a propósito: "todo" es una palabra del
    // castellano y aparece legítimamente en la prosa; "TODO" es un marcador.
    expect(contenido).not.toMatch(/\b(PENDIENTE|TODO|FIXME|XXXX|PLACEHOLDER)\b/);
    expect(contenido).not.toMatch(/lorem ipsum/i);
  });
});
