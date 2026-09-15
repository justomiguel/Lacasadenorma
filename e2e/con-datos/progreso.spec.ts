import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";

const { ui } = getContent("es");

/**
 * El progreso público no son cifras: es el relato y las fotos del trabajo.
 *
 * `/reconstruccion` muestra la última novedad publicada (`limit: 1`). El
 * relato tiene que estar; el título concreto no es el contrato. Las pruebas
 * que publican otra la vuelven a borrador al terminar.
 */

test.describe("flujo 3 · ver el trabajo", () => {
  test("la home no publica recibido, gastado ni saldo", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/^recibido$/i)).toHaveCount(0);
    await expect(page.getByText(/^gastado$/i)).toHaveCount(0);
    await expect(page.getByText(/^saldo$/i)).toHaveCount(0);
  });

  test("los datos para transferir están en donar dinero, no en la home", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-figure]")).toHaveCount(0);

    await page.goto("/ayudar/dinero");
    await expect(page.locator("[data-figure]").first()).toBeVisible();
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

    // La última novedad publicada, no una fila fija del fixture: otras suites
    // publican la suya y esta página pide `limit: 1`. El relato tiene que estar;
    // el título concreto no es el contrato.
    const loUltimo = page.getByRole("region", {
      name: ui.reconstructionPage.latestHeading,
    });

    await expect(loUltimo).toBeVisible();
    await expect(
      loUltimo.locator("ol li").getByRole("heading", { level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: ui.reconstructionPage.seeNews }),
    ).toBeVisible();
  });

  test("el cierre de la home habla de la casa y no de una fundación constituida", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: ui.home.nextTitle })).toBeVisible();
    await expect(page.getByText(ui.home.nextLead)).toBeVisible();
  });
});
