import { expect, test } from "@playwright/test";

/**
 * Flujo crítico 5: copiar el dato de la cuenta.
 *
 * Es el último gesto antes de que alguien mueva dinero, y es donde un error es
 * irreversible: un CBU copiado a medias no rebota, transfiere a otra cuenta.
 *
 * Por eso lo que se afirma no es que el botón exista ni que cambie de texto, sino que
 * **el portapapeles termina conteniendo exactamente el valor que estaba en pantalla**.
 * Un botón que dice "Copiado" y copió otra cosa —o nada— pasa cualquier verificación
 * de interfaz y produce el único fallo que este sitio no puede permitirse.
 *
 * Corre sólo en Chromium: es el único navegador que concede el permiso del
 * portapapeles sin intervención de una persona. `playwright.config.ts` excluye este
 * archivo en los otros proyectos por nombre.
 */

test.describe("flujo 5 · copiar la cuenta", () => {
  test("lo que queda en el portapapeles es lo que estaba a la vista", async ({
    page,
  }) => {
    await page.goto("/ayudar");

    const panel = page.getByRole("tabpanel");
    const dato = panel.locator("[data-figure]").first();
    const esperado = (await dato.innerText()).trim();

    expect(esperado.length, "tiene que haber un dato para copiar").toBeGreaterThan(0);

    await panel
      .getByRole("button", { name: /^copiar$/i })
      .first()
      .click();

    const copiado = await page.evaluate(() => navigator.clipboard.readText());

    expect(copiado, "el portapapeles tiene que tener el valor exacto").toBe(esperado);
  });

  test("el resultado se anuncia por una región viva, no sólo con un color", async ({
    page,
  }) => {
    await page.goto("/ayudar");

    const panel = page.getByRole("tabpanel");
    // Por posición y no por nombre accesible: el nombre es justamente lo que va a
    // cambiar, y un localizador por nombre dejaría de encontrar el botón que acaba de
    // apretarse.
    const boton = panel.locator("button").first();

    await boton.click();

    // El texto del botón cambia, y eso lo ve quien mira. La región viva es lo que
    // escucha quien no mira: sin ella, la confirmación no existe.
    await expect(boton).toHaveText(/copiado/i);

    const aviso = panel.locator("[aria-live='polite']").first();

    await expect(aviso).toHaveText(/se copió/i);
  });

  test("el valor sigue seleccionable a mano, por si el permiso no está", async ({
    page,
  }) => {
    await page.goto("/ayudar");

    const dato = page.getByRole("tabpanel").locator("[data-figure]").first();

    // Nada de `user-select: none` ni de un valor escondido detrás del botón: si el
    // portapapeles falla, seleccionar y copiar a mano tiene que seguir siendo posible.
    await expect(dato).toBeVisible();
    expect(
      await dato.evaluate((nodo) => getComputedStyle(nodo).userSelect),
      "el dato bancario tiene que poder seleccionarse",
    ).not.toBe("none");
  });

  test("el botón de copiar es alcanzable y accionable con teclado", async ({ page }) => {
    await page.goto("/ayudar");

    const boton = page.getByRole("tabpanel").locator("button").first();

    await boton.focus();
    await page.keyboard.press("Enter");

    await expect(boton).toHaveText(/copiado/i);

    // Y el objetivo táctil llega al mínimo de la 2.2 en el viewport chico, que es
    // donde se va a tocar de verdad.
    await page.setViewportSize({ width: 360, height: 640 });

    const caja = await boton.boundingBox();

    expect(caja).not.toBeNull();
    expect(
      caja?.height ?? 0,
      "el botón de copiar tiene que medir 24 px o más",
    ).toBeGreaterThanOrEqual(24);
  });
});
