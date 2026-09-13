import { describe, expect, it } from "vitest";

import { LOCALES } from "@/src/i18n/locale";

import { getContent } from "./pack";

/**
 * Lo que el esquema de `emails.json` no puede afirmar solo.
 *
 * Zod verifica que cada correo tenga asunto, cuerpo, acción y motivo. No puede
 * verificar nada que compare **los dos idiomas entre sí**, y ahí están los dos
 * errores que este contenido admite y que no se ven leyendo un archivo:
 *
 *   1. Una traducción que se come una marca de sustitución. El correo sale, se
 *      entrega, y no nombra lo que la persona reservó. `messages.test.ts` no lo
 *      detecta: comprueba que no quede ninguna marca **sin reemplazar**, y una
 *      marca ausente tampoco queda sin reemplazar.
 *   2. Alguien traduciendo el aviso al equipo, que va en castellano a propósito
 *      porque lleva a `/admin` y el backoffice no se traduce (ADR-014). La copia
 *      idéntica en los dos archivos es la decisión; sin esta prueba se lee como
 *      un olvido y la próxima persona lo "arregla".
 */

/** Las tres de `content/schemas/emails.ts`, y ninguna más. */
const MARCAS = ["{what}", "{when}", "{link}"] as const;

function todoElTexto(correo: {
  subject: string;
  body: readonly string[];
  action: string;
  why: string;
}): string {
  return [correo.subject, ...correo.body, correo.action, correo.why].join("\n");
}

const CLASES = ["pledgeConfirmed", "pledgeReminder", "pledgeFulfilled"] as const;

describe("el texto de los correos", () => {
  it("usa las mismas marcas de sustitución en los dos idiomas", () => {
    for (const clase of CLASES) {
      const usadas = LOCALES.map((locale) => {
        const texto = todoElTexto(getContent(locale).emails[clase]);

        return MARCAS.filter((marca) => texto.includes(marca));
      });

      expect(usadas[1], `${clase}: el inglés no usa las mismas marcas`).toEqual(
        usadas[0],
      );
    }
  });

  it("no inventa una marca que el armador no sabe reemplazar", () => {
    for (const locale of LOCALES) {
      for (const clase of [...CLASES, "staffNewPledge"] as const) {
        const texto = todoElTexto(getContent(locale).emails[clase]);
        const encontradas = texto.match(/\{[a-z]+\}/g) ?? [];

        for (const marca of encontradas) {
          expect(MARCAS, `${locale}/${clase}: ${marca}`).toContain(marca);
        }
      }
    }
  });

  /**
   * El vencimiento sólo lo nombra el recordatorio. Si otro correo lo nombrara,
   * saldría vacío cuando la reserva no vence —`substitute()` tira la oración
   * entera— y el correo perdería un párrafo sin que nadie se entere.
   */
  it("sólo el recordatorio nombra el vencimiento", () => {
    for (const locale of LOCALES) {
      expect(todoElTexto(getContent(locale).emails.pledgeReminder)).toContain("{when}");

      for (const clase of [
        "pledgeConfirmed",
        "pledgeFulfilled",
        "staffNewPledge",
      ] as const) {
        expect(
          todoElTexto(getContent(locale).emails[clase]),
          `${locale}/${clase}`,
        ).not.toContain("{when}");
      }
    }
  });

  it("el aviso al equipo dice lo mismo en los dos archivos, y en castellano", () => {
    expect(getContent("en").emails.staffNewPledge).toEqual(
      getContent("es").emails.staffNewPledge,
    );
  });

  /**
   * "Por qué recibís esto" es lo que separa un correo transaccional de uno que
   * parece no pedido. Que exista lo verifica el esquema; que **explique algo** no
   * lo puede verificar ninguna máquina, así que se verifica lo que sí se puede:
   * que no sea una fórmula de tres palabras.
   */
  it("los cuatro explican por qué la persona los está recibiendo", () => {
    for (const locale of LOCALES) {
      for (const clase of [...CLASES, "staffNewPledge"] as const) {
        expect(
          getContent(locale).emails[clase].why.split(/\s+/).length,
          `${locale}/${clase}`,
        ).toBeGreaterThan(8);
      }
    }
  });
});
