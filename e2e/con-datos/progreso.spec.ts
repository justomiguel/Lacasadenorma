import { expect, test } from "@playwright/test";

import { cifraPorEtiqueta } from "../soporte/cifras";

/**
 * Flujo crítico 3: ver el progreso.
 *
 * La pregunta que trae a alguien acá es "¿esto es real?", y lo que la contesta no es un
 * número: es un número **con fecha** y con la aritmética a la vista. Por eso lo que se
 * afirma es la coherencia entre las tres cifras, no que cada una exista.
 *
 * `data-figure` marca toda cifra del sitio. Sirve para lo contrario de lo que parece:
 * permite afirmar que en un estado sin datos **no hay ninguna**, y acá permite
 * encontrarlas sin depender de la redacción.
 */

test.describe("flujo 3 · ver el progreso", () => {
  test("la home muestra recibido, gastado y saldo, y el saldo cierra", async ({
    page,
  }) => {
    await page.goto("/");

    const recibido = await cifraPorEtiqueta(page, /^recibido$/i);
    const gastado = await cifraPorEtiqueta(page, /^gastado$/i);
    const saldo = await cifraPorEtiqueta(page, /^saldo$/i);

    expect(recibido).toBeGreaterThan(0);
    expect(gastado).toBeGreaterThan(0);

    // La resta tiene que cerrar exactamente: las tres cifras salen de la misma
    // lectura y de una vista agregada en la base, así que un desvío de un peso
    // significa que alguien las está calculando dos veces.
    expect(saldo).toBeCloseTo(recibido - gastado, 2);
  });

  test("el objetivo y el porcentaje son coherentes entre sí", async ({ page }) => {
    await page.goto("/reconstruccion");

    const barra = page.getByRole("progressbar").first();

    await expect(barra).toBeVisible();

    const ahora = Number(await barra.getAttribute("aria-valuenow"));
    const etiqueta = (await barra.getAttribute("aria-label")) ?? "";

    expect(ahora).toBeGreaterThanOrEqual(0);
    expect(ahora).toBeLessThanOrEqual(100);

    // La etiqueta accesible tiene que nombrar las dos cifras: un porcentaje solo no
    // dice nada, y quien usa un lector de pantalla recibe sólo esta etiqueta.
    expect(etiqueta).toMatch(/recaudad/i);
    expect(etiqueta).toMatch(/objetivo/i);
  });

  test("la fecha de conciliación está publicada junto a las cifras", async ({ page }) => {
    await page.goto("/transparencia");

    await expect(
      page.getByText(/conciliado con el resumen del banco/i).first(),
      "el total sin fecha de conciliación no es un dato verificable",
    ).toBeVisible();
  });

  test("el avance de la obra se ve como hitos con su estado", async ({ page }) => {
    await page.goto("/reconstruccion");

    const seccion = page.locator("main");

    await expect(seccion.getByText(/completado/i).first()).toBeVisible();
    await expect(seccion.getByText(/en curso/i).first()).toBeVisible();
  });

  test("un rubro sin cotizar se dice, en lugar de mostrarse en cero", async ({
    page,
  }) => {
    await page.goto("/reconstruccion");

    // El fixture deja el último rubro sin monto a propósito. Un cero ahí se leería
    // como "esto es gratis", que es lo contrario de lo que pasa.
    await expect(page.getByText(/sin cotizar/i).first()).toBeVisible();
  });
});
