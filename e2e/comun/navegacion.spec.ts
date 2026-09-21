import { expect, test } from "@playwright/test";

import { HEADER_NAV } from "@/components/site/navigation";

import { VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * Que se pueda llegar a cualquier sección del mockup.
 *
 * En teléfono el índice es el menú hamburguesa. En escritorio, el encabezado.
 */

test.describe("navegación", () => {
  test("en 360 px el menú abre las secciones, sin Cómo ayudar", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await page.goto("/");

    await page.getByRole("button", { name: /abrir el menú/i }).click();

    const menu = page.getByRole("dialog");

    await expect(menu).toBeVisible();

    for (const item of HEADER_NAV) {
      await expect(
        menu.locator(`a[href="${item.href}"]`),
        `falta ${item.href} en el menú`,
      ).toBeVisible();
    }

    await expect(
      menu.getByRole("link", { name: /^cómo ayudar$/i }),
      "Cómo ayudar no va en el menú: ya está el CTA",
    ).toHaveCount(0);

    await expect(
      menu.getByRole("link", { name: /^ingresar$/i }),
      "falta Ingresar en el menú",
    ).toBeVisible();
  });

  test("en escritorio las secciones están en el encabezado, sin Cómo ayudar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const encabezado = page.getByRole("banner");

    for (const item of HEADER_NAV) {
      await expect(
        encabezado.locator(`a[href="${item.href}"]`).first(),
        `falta ${item.href} en el encabezado`,
      ).toBeVisible();
    }

    await expect(
      encabezado.getByRole("link", { name: /^cómo ayudar$/i }),
      "Cómo ayudar no va en el encabezado: ya está el CTA",
    ).toHaveCount(0);

    const ingresar = encabezado.getByRole("link", { name: /^ingresar$/i });

    await expect(ingresar, "falta Ingresar en el encabezado").toBeVisible();
    await expect(
      ingresar.locator("svg"),
      "Ingresar en el encabezado lleva icono",
    ).toBeVisible();

    const caja = await ingresar.evaluate((nodo) => {
      const estilo = getComputedStyle(nodo);

      return {
        radio: estilo.borderRadius,
        borde: estilo.borderTopWidth,
      };
    });

    expect(caja.radio, "Ingresar en el encabezado tiene que tener caja").not.toBe("0px");
    expect(
      Number.parseFloat(caja.borde),
      "Ingresar en el encabezado no puede ser texto suelto: lleva borde",
    ).toBeGreaterThan(0);

    const ayudar = encabezado.getByRole("link", { name: /ayudar a reconstruir/i });

    await expect(ayudar, "falta Ayudar a reconstruir en el encabezado").toBeVisible();
    await expect(
      ayudar.locator("svg"),
      "Ayudar a reconstruir en el encabezado lleva icono",
    ).toBeVisible();

    const fondo = await ayudar.evaluate((nodo) => getComputedStyle(nodo).backgroundColor);

    expect(
      fondo,
      "la acción del encabezado no puede ser texto transparente: no se lee",
    ).not.toMatch(/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)|transparent/i);
  });

  test("el encabezado lleva el símbolo junto al nombre", async ({ page }) => {
    await page.goto("/");

    const home = page.getByRole("banner").getByRole("link", { name: "La Casa de Norma" });

    await expect(home).toBeVisible();
    await expect(home.locator("img"), "falta el símbolo de la marca").toBeVisible();
  });

  test("el favicon responde y no es un 404", async ({ request }) => {
    const respuesta = await request.get("/favicon.ico");

    expect(respuesta.status(), "/favicon.ico no puede 404 (ADR-022)").toBe(200);
    expect(respuesta.headers()["content-type"]).toMatch(/image\//);
  });

  test("el encabezado marca la página abierta", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const item of HEADER_NAV) {
      await page.goto(item.href);

      const encabezado = page.getByRole("banner");

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
