import { expect, test } from "@playwright/test";

import { esperarSinViolaciones } from "../soporte/axe";

/**
 * El círculo 01 ORIGINAL tiene que verse donde la gente aterriza sin el relato
 * fotográfico: el encabezado, el login, la cuenta y las legales.
 *
 * El locator mira `simbolo.png` y no `/marca/simbolo`: `next/image` sirve el
 * recorte por `/_next/image?url=%2Fmarca%2Fsimbolo.png`, y esa URL no contiene
 * la barra literal.
 */

const PANTALLAS = [
  { path: "/", nombre: "el encabezado de la home" },
  { path: "/cuenta/ingresar", nombre: "Ingresar" },
  { path: "/cuenta/crear", nombre: "Crear una cuenta" },
  { path: "/legales/privacidad", nombre: "Privacidad" },
  { path: "/en/legales/privacidad", nombre: "Privacy" },
  { path: "/legales/terminos", nombre: "Términos" },
  { path: "/admin/login", nombre: "el login del backoffice" },
] as const;

test.describe("el símbolo en las pantallas de identidad", () => {
  for (const pantalla of PANTALLAS) {
    test(`${pantalla.nombre} muestra el círculo 01 ORIGINAL`, async ({ page }) => {
      await page.goto(pantalla.path);

      await expect(
        page.locator('img[src*="simbolo.png"]').first(),
        `${pantalla.path} tiene que llevar el símbolo`,
      ).toBeVisible();
    });
  }
});

/**
 * Hay dos root layouts (ADR-023). Una URL que no calza ninguno no entra a
 * `not-found.tsx` y Next sirve su 404 gris. Estos tests existen para que eso
 * no vuelva: el 404 propio, con el círculo, es el que tiene que responder.
 */
test.describe("el 404 de una URL que no existe", () => {
  test("en castellano es la pantalla del sitio, no el 404 de Next", async ({ page }) => {
    const respuesta = await page.goto("/esta-pagina-no-existe");

    expect(respuesta?.status(), "tiene que ser un 404 de verdad").toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: /esta página no está/i }),
    ).toBeVisible();
    await expect(page.locator('img[src*="simbolo.png"]').first()).toBeVisible();
    await expect(page.getByText(/^404$/)).toHaveCount(0);
    await esperarSinViolaciones(page, "/esta-pagina-no-existe");
  });

  test("en inglés también, y en inglés", async ({ page }) => {
    const respuesta = await page.goto("/en/esta-pagina-no-existe");

    expect(respuesta?.status(), "tiene que ser un 404 de verdad").toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: /this page is not here/i }),
    ).toBeVisible();
    await expect(page.locator('img[src*="simbolo.png"]').first()).toBeVisible();
    await esperarSinViolaciones(page, "/en/esta-pagina-no-existe");
  });
});
