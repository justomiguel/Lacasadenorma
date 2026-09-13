import { describe, expect, it } from "vitest";

import { contentOnlyLayer } from "../test-support/fake-data-layer";
import { runCapability } from "./registry";
import { CAPACIDADES_CON_BASE, context, esperarOk } from "./capabilities-test-helpers";

describe("sin base configurada", () => {
  it.each(CAPACIDADES_CON_BASE)(
    "%s dice que no está disponible, no devuelve cero",
    async (name) => {
      const result = await runCapability(name, {}, context(contentOnlyLayer));

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.code).toBe("unavailable");
      // Un cero devuelto como dato real es una mentira que quien consume no puede
      // detectar. Que no haya `output` es justamente lo que lo impide.
      expect(result).not.toHaveProperty("output");
      expect(result).not.toHaveProperty("text");
    },
  );

  it.each(CAPACIDADES_CON_BASE)("%s explica en castellano qué pasó", async (name) => {
    const result = await runCapability(name, {}, context(contentOnlyLayer));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    // El mensaje lo lee un modelo que se lo va a repetir a una persona: tiene que
    // ser prosa en castellano, no un código ni un volcado técnico (amenaza I6).
    expect(result.message).toMatch(/cifras|campaña|página/i);
    expect(result.message.length).toBeGreaterThan(20);
    expect(result.message).not.toMatch(/error:|undefined|null|Exception/);
  });

  it("get_norma_story sigue respondiendo: el contenido editorial está en el repositorio", async () => {
    // Es lo que permite clonar el repositorio y ver el sitio completo sin
    // credenciales (SC-012). Si esta capacidad dependiera de la base, la
    // historia de Norma desaparecería en un despliegue sin configurar.
    const { output, text } = esperarOk(
      await runCapability("get_norma_story", {}, context(contentOnlyLayer)),
    );

    expect(output).toMatchObject({ bornOn: "1955-01-19", diedOn: null });
    expect(Array.isArray(output.paragraphs) && output.paragraphs.length).toBeGreaterThan(
      0,
    );
    expect(text.length).toBeGreaterThan(0);
  });
});
