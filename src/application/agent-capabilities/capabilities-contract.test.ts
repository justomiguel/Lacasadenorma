import { describe, expect, it } from "vitest";

import { CAPABILITY_LIMITS, capabilities, runCapability } from "./registry";
import { CONTRATO, NOMBRES, context, esperarOk } from "./capabilities-test-helpers";

describe("las cinco capacidades", () => {
  it("el contrato del test cubre exactamente las capacidades registradas", () => {
    // Sin esto, agregar una capacidad sexta pasaría por acá sin que nada la
    // revise: los `it.each` de abajo recorren el registro, no una lista fija.
    expect(NOMBRES.toSorted()).toEqual(Object.keys(CONTRATO).toSorted());
  });

  it.each(NOMBRES)("%s devuelve la forma exacta del contrato", async (name) => {
    const { output } = esperarOk(await runCapability(name, {}, context()));

    // Un campo de más es tan grave como uno de menos: es un dato que el contrato
    // no revisó y que nadie sabe de dónde salió.
    expect(Object.keys(output).toSorted()).toEqual(
      [...(CONTRATO[name] ?? [])].toSorted(),
    );
  });

  it.each(NOMBRES)(
    "%s devuelve texto y entra en el presupuesto de Chrome",
    async (name) => {
      const { text } = esperarOk(await runCapability(name, {}, context()));

      // El texto es lo que lee un agente que no procesa el JSON: vacío equivale a
      // no haber respondido. Pasado de largo, Chrome lo corta por la mitad.
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(CAPABILITY_LIMITS.output);
    },
  );

  it.each(NOMBRES)("%s respeta los límites de nombre y descripción", (name) => {
    const capability = capabilities.find((item) => item.name === name);

    expect(capability?.name.length).toBeLessThanOrEqual(CAPABILITY_LIMITS.name);
    expect(capability?.description.length).toBeLessThanOrEqual(
      CAPABILITY_LIMITS.description,
    );
  });
});
