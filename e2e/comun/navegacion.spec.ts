import { expect, test } from "@playwright/test";

import { PRIMARY_NAV } from "@/components/site/navigation";

import { VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * Que se pueda llegar a cualquier sección sin recorrer la página entera.
 *
 * Es el criterio que ADR-021 agregó a `ux.md` §12, y viene de una queja concreta:
 * «no veo clara la navegación». Durante once páginas el único índice del sitio
 * estuvo en el pie, a catorce pantallas de teléfono de la apertura. La página
 * pasaba todos los tests que había: ninguno preguntaba **dónde** estaba el índice.
 *
 * Lo que se afirma acá es eso y nada más: en 360 px las seis rutas primarias se
 * alcanzan en el primer tramo del documento, y en escritorio están en el
 * encabezado con la página abierta marcada. El «primer tramo» son tres pantallas,
 * no una: el sumario va después de la apertura a propósito, porque lo primero que
 * tiene que ver quien llega es de qué se trata, no un menú.
 *
 * La primera corrida de este archivo encontró el pie en lugar del sumario: el
 * sumario salía sin nombre accesible porque `Container` no pasaba `aria-label`, y
 * los tres puntos de navegación se llamaban igual. Ninguno de los tests que había
 * lo detectaba, y desde el teclado eran tres landmarks indistinguibles.
 */

const TRAMO_INICIAL = VIEWPORT_MINIMO.height * 3;

test.describe("navegación", () => {
  test("en 360 px las seis secciones se alcanzan en el primer tramo", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await page.goto("/");

    const sumario = page.getByRole("navigation", { name: /índice de secciones/i });

    await expect(sumario, "el sumario del documento tiene que estar").toBeVisible();

    for (const item of PRIMARY_NAV) {
      const enlace = sumario.locator(`a[href="${item.href}"]`);

      await expect(enlace, `falta ${item.href} en el sumario`).toBeVisible();

      const caja = await enlace.boundingBox();

      expect(caja, `${item.href} tiene que tener una caja medible`).not.toBeNull();
      expect(
        caja === null ? Infinity : caja.y,
        `${item.href} tiene que estar en el primer tramo del documento`,
      ).toBeLessThanOrEqual(TRAMO_INICIAL);
    }
  });

  test("cada sección del sumario dice qué hay adentro", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await page.goto("/");

    const sumario = page.getByRole("navigation", { name: /índice de secciones/i });

    // Sin esto el sumario es una lista de seis títulos, que no le dice a nadie a
    // dónde conviene ir primero.
    for (const item of PRIMARY_NAV) {
      await expect(
        sumario.getByText(item.summary, { exact: false }),
        `falta el resumen de ${item.href}`,
      ).toBeVisible();
    }
  });

  test("en escritorio las seis secciones están en el encabezado", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const encabezado = page.getByRole("banner");

    for (const item of PRIMARY_NAV) {
      await expect(
        encabezado.locator(`a[href="${item.href}"]`).first(),
        `falta ${item.href} en el encabezado`,
      ).toBeVisible();
    }
  });

  test("el encabezado marca la página abierta", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const item of PRIMARY_NAV) {
      await page.goto(item.href);

      const encabezado = page.getByRole("banner");

      // `aria-current` y no sólo el subrayado: quien navega con lector de
      // pantalla necesita que la marca exista, no que se vea.
      await expect(
        encabezado.locator(`a[href="${item.href}"][aria-current="page"]`),
        `${item.href} abierta tendría que estar marcada en el encabezado`,
      ).toHaveCount(1);

      await expect(
        encabezado.locator('a[aria-current="page"]'),
        "hay una sola página abierta a la vez",
      ).toHaveCount(1);
    }
  });
});
