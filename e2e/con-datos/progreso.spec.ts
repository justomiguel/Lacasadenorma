import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";

const { ui } = getContent("es");

/**
 * El progreso público no son cifras: es el relato y las fotos del trabajo.
 */

test.describe("flujo 3 · ver el trabajo", () => {
  test("la home no publica recibido, gastado ni saldo", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("[data-figure]").first()).toBeVisible();
    await expect(page.getByText(/^recibido$/i)).toHaveCount(0);
    await expect(page.getByText(/^gastado$/i)).toHaveCount(0);
    await expect(page.getByText(/^saldo$/i)).toHaveCount(0);
  });

  test("la reconstrucción muestra el trabajo y no un tablero de avance", async ({
    page,
  }) => {
    await page.goto("/reconstruccion");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByText(/cuánto sale cada rubro/i)).toHaveCount(0);
    await expect(page.getByText(/cómo va la obra/i)).toHaveCount(0);
    await expect(page.getByText(/sin cotizar/i)).toHaveCount(0);
  });

  test("el cierre de la home habla de la casa y no de una fundación constituida", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: ui.home.nextTitle })).toBeVisible();
    await expect(page.getByText(ui.home.nextLead)).toBeVisible();
  });
});
