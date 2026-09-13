import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getContent } from "./pack";
import { parseContent, personSchema, siteSchema } from "./schema";

const { faq, help, legacy, legal, norma, site, transparency } = getContent("es");

/** Sin acentos, sin puntuación y en minúsculas: compara la frase, no su formato. */
function normalizar(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cuánto de la frase más corta está contenido en la más larga, entre 0 y 1.
 * Un 1 significa que una dice todo lo que dice la otra.
 */
function parecido(a: string, b: string): number {
  const uno = new Set(normalizar(a).split(" "));
  const dos = new Set(normalizar(b).split(" "));
  const comunes = [...uno].filter((palabra) => dos.has(palabra)).length;

  return comunes / Math.min(uno.size, dos.size);
}

describe("parseContent", () => {
  it("falla nombrando el archivo y el campo cuando falta un dato", () => {
    expect(() =>
      parseContent(siteSchema, { name: "La Casa de Norma" }, "es/site.json"),
    ).toThrow(/content\/es\/site\.json/);
    expect(() =>
      parseContent(siteSchema, { name: "La Casa de Norma" }, "es/site.json"),
    ).toThrow(/tagline/);
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
    expect(getContent("en").site.tagline).toBe(
      "We are rebuilding a house. We are building a legacy.",
    );
  });

  it("responde las preguntas que el relato no cubre", () => {
    expect(faq).toHaveLength(3);

    for (const entry of faq) {
      expect(entry.question.endsWith("?")).toBe(true);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  /**
   * Nueve enlaces que dicen todos lo mismo son nueve enlaces inútiles para quien
   * recorre la página con un lector de pantalla: la lista de enlaces se escucha
   * como la misma frase repetida y no se puede elegir ninguno. Y "ver más sobre
   * esto" es exactamente el tipo de texto genérico que el proyecto no usa.
   */
  it("cada pregunta que enlaza dice a dónde lleva, con su propio texto", () => {
    const conEnlace = faq.filter((entry) => entry.href !== null);

    expect(conEnlace.length).toBeGreaterThan(0);

    const etiquetas = conEnlace.map((entry) => entry.linkLabel);

    for (const etiqueta of etiquetas) {
      expect(etiqueta).not.toBeNull();
      expect(etiqueta).not.toMatch(/^(ver más|leer más|más info)/i);
    }

    // Dos preguntas pueden llevar a la misma página con el mismo texto; lo que no
    // puede pasar es que el mismo texto lleve a destinos distintos.
    const porEtiqueta = new Map<string, Set<string>>();

    for (const entry of conEnlace) {
      const destinos = porEtiqueta.get(entry.linkLabel ?? "") ?? new Set<string>();

      destinos.add(entry.href ?? "");
      porEtiqueta.set(entry.linkLabel ?? "", destinos);
    }

    for (const [etiqueta, destinos] of porEtiqueta) {
      expect([...destinos], etiqueta).toHaveLength(1);
    }
  });

  it("una pregunta sin página propia no arrastra un texto de enlace", () => {
    for (const entry of faq) {
      expect(entry.href === null, entry.question).toBe(entry.linkLabel === null);
    }
  });

  it("no afirma que Fundación Norma sea una organización constituida (SC de US5)", () => {
    const legacyText = [legacy.lead, ...legacy.paragraphs].join(" ").toLowerCase();

    expect(legacyText).toContain("todavía no existe como organización");
  });

  /**
   * La bajada de `/norma` decía casi palabra por palabra lo mismo que el segundo
   * párrafo, y las dos cosas se leen a doscientos píxeles de distancia. En una
   * página sobre una persona que murió, leer la misma frase dos veces suena a
   * relleno, que es lo contrario de lo que la página tiene que transmitir.
   */
  it("la bajada de la historia de Norma no repite un párrafo", () => {
    const frases = norma.paragraphs.flatMap((paragraph) => paragraph.split(". "));

    for (const frase of frases) {
      // No se compara por igualdad: la repetición real no era literal —"las
      // historias de Riacho He Hé" contra "las historias de su pueblo"— y una
      // aserción de igualdad la habría dejado pasar. Lo que se mide es cuánto de
      // la frase más corta está contenido en la otra.
      expect(parecido(norma.summary, frase), frase).toBeLessThan(0.8);
    }
  });

  it("los testimonios salen del documento familiar, transcritos, no inventados", () => {
    expect(norma.quotes).toHaveLength(3);

    for (const entry of norma.quotes) {
      expect(entry.quote.length).toBeGreaterThan(20);
      expect(entry.author.length).toBeGreaterThan(0);
      expect(entry.relation.length).toBeGreaterThan(0);
    }

    expect(norma.quotes.map((entry) => entry.author)).toEqual([
      "Celina Espíndola",
      "Cristian Alejandro Cabrera",
      "Miguel Vargas",
    ]);
  });

  it("no promete una rendición de cifras que el sitio no muestra", () => {
    const texto = JSON.stringify([faq, transparency]).toLowerCase();

    expect(texto).not.toContain("peso por peso");
    expect(texto).not.toContain("cada gasto se publica");
    expect(texto).not.toContain("los gastos sí");
  });

  it("el PDF de la obra conmemorativa está en el repositorio", () => {
    expect(existsSync(`public${norma.book.href}`)).toBe(true);
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
      faq,
      legal,
    ]);

    // La comparación distingue mayúsculas a propósito: "todo" es una palabra del
    // castellano y aparece legítimamente en la prosa; "TODO" es un marcador.
    expect(contenido).not.toMatch(/\b(PENDIENTE|TODO|FIXME|XXXX|PLACEHOLDER)\b/);
    expect(contenido).not.toMatch(/lorem ipsum/i);
  });
});

function photoKeys(value: unknown): { url: string; width: number; height: number }[] {
  if (Array.isArray(value)) {
    return value.flatMap(photoKeys);
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const nested = Object.values(record).flatMap(photoKeys);

  return typeof record.url === "string" &&
    typeof record.width === "number" &&
    typeof record.height === "number"
    ? [{ url: record.url, width: record.width, height: record.height }, ...nested]
    : nested;
}

describe("los dos idiomas declaran las mismas fotografías", () => {
  it("url, ancho y alto coinciden: el archivo no se duplica, sólo el alt", () => {
    const es = photoKeys(getContent("es"));
    const en = photoKeys(getContent("en"));

    expect(en).toEqual(es);
  });

  it("el inglés también responde las mismas preguntas", () => {
    expect(getContent("en").faq).toHaveLength(3);
  });
});
