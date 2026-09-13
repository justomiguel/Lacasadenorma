import { describe, expect, it } from "vitest";

import { getContent } from "./pack";

const { whatHappened } = getContent("es");
const { whatHappened: whatHappenedEn } = getContent("en");

describe("cobertura de prensa", () => {
  it("los dos idiomas enlazan las mismas notas, en el mismo orden", () => {
    expect(whatHappened.press.map((item) => item.url)).toEqual(
      whatHappenedEn.press.map((item) => item.url),
    );
    expect(whatHappened.press.map((item) => item.kind)).toEqual(
      whatHappenedEn.press.map((item) => item.kind),
    );
  });

  it("abre con la despedida, cierra con el retrato de antes, y no lleva utm", () => {
    expect(whatHappened.press[0]?.kind).toBe("memorial");
    expect(whatHappened.press.at(-1)?.kind).toBe("context");

    for (const item of whatHappened.press) {
      expect(item.url).not.toMatch(/utm_source/i);
    }
  });

  it("cada título es único y no es un leer más", () => {
    const titulos = whatHappened.press.map((item) => item.title);
    const titulosEn = whatHappenedEn.press.map((item) => item.title);

    expect(new Set(titulos).size).toBe(titulos.length);
    expect(new Set(titulosEn).size).toBe(titulosEn.length);

    for (const titulo of [...titulos, ...titulosEn]) {
      expect(titulo).not.toMatch(/^(ver más|leer más|read more|más info)/i);
    }
  });

  /**
   * La crónica policial de esos días nombra mal el apellido y, en un caso, el
   * pueblo. Enlazamos las notas; no copiamos esos errores al título.
   */
  it("los títulos dicen Bedoya y Riacho He Hé, no Bedolla ni Laguna Blanca", () => {
    const titulos = [...whatHappened.press, ...whatHappenedEn.press]
      .map((item) => item.title)
      .join("\n");

    expect(titulos).toMatch(/Bedoya/);
    expect(titulos).not.toMatch(/Bedolla/);
    expect(titulos).not.toMatch(/Laguna Blanca/i);
  });
});
