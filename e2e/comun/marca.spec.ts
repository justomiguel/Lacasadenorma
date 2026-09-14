import { expect, test } from "@playwright/test";

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
