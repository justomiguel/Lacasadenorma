import { describe, expect, it } from "vitest";

import { runCapability } from "./registry";
import {
  APORTES_INDIVIDUALES,
  NOMBRES,
  SENTINELS,
  SITE,
  TOTAL_RECIBIDO,
  context,
  esperarOk,
} from "./capabilities-test-helpers";

describe("ninguna capacidad filtra datos privados (A6)", () => {
  it.each(NOMBRES)("%s no deja pasar ningún centinela privado", async (name) => {
    const { output, text } = esperarOk(await runCapability(name, {}, context()));
    const serializado = `${JSON.stringify(output)} ${text}`;

    for (const centinela of Object.values(SENTINELS)) {
      expect(serializado).not.toContain(centinela);
    }
  });

  it.each(NOMBRES)(
    "%s no expone nombres, correos ni rutas de comprobante",
    async (name) => {
      const { output, text } = esperarOk(await runCapability(name, {}, context()));
      const serializado = `${JSON.stringify(output)} ${text}`;

      // Publicar que el comprobante existe es la promesa (FR-013); publicar dónde
      // está el archivo es la fuga que esa promesa tiene que evitar.
      expect(serializado).not.toContain("storagePath");
      expect(serializado).not.toContain("storage_path");
      expect(serializado).not.toContain("comprobantes/");
      expect(serializado).not.toContain(".pdf");
      expect(serializado).not.toContain("voidReason");
      expect(serializado).not.toContain("void_reason");
      expect(serializado).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    },
  );

  it.each(NOMBRES)("%s no expone montos de aportes individuales", async (name) => {
    const { output, text } = esperarOk(await runCapability(name, {}, context()));
    const serializado = `${JSON.stringify(output)} ${text}`;

    // La capa pública sólo ve totales por moneda (ADR-016). Estos dos montos
    // suman el total sembrado: si alguno se pudiera leer en la salida, el camino
    // del agente estaría viendo aportes uno por uno, que nunca son públicos.
    for (const aporte of APORTES_INDIVIDUALES) {
      expect(serializado).not.toContain(String(aporte));
    }
  });

  it("el resumen de la rendición publica cantidades, no archivos ni identidades", async () => {
    const { output } = esperarOk(
      await runCapability("get_transparency_summary", {}, context()),
    );

    expect(output).toMatchObject({
      receivedMinor: TOTAL_RECIBIDO,
      spentMinor: 10_000_000,
      balanceMinor: 14_000_000,
      expenseCount: 1,
      receiptCount: 2,
      detailUrl: `${SITE}/transparencia`,
    });
    // El proveedor sí es público en el detalle de la página, pero el resumen
    // agregado no lo incluye: cada capacidad devuelve su forma y nada más.
    expect(JSON.stringify(output)).not.toContain("Corralón");
  });
});
