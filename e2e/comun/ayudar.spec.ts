import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";

const { help, site, ui } = getContent("es");

/**
 * Flujo de ADR-045: «Ayudar a reconstruir» presenta tres caminos a la vista.
 *
 * El tablero de donaciones no vive acá. Ir lleva al contacto y al mapa del
 * pueblo, donar plata a `/ayudar/dinero`, traer lo que falta al catálogo.
 */

test.describe("cómo ayudar · tres caminos", () => {
  test("los tres caminos están a la vista y no hay pestañas", async ({ page }) => {
    await page.goto("/ayudar");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(help.title);
    await expect(page.getByRole("heading", { name: ui.home.pathHands })).toBeVisible();
    await expect(page.getByRole("heading", { name: ui.home.pathMoney })).toBeVisible();
    await expect(page.getByRole("heading", { name: ui.home.pathArticles })).toBeVisible();

    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByText(help.accounts.AR.cbu, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^copiar$/i })).toHaveCount(0);
  });

  test("dar una mano lleva al contacto y al mapa del pueblo", async ({ page }) => {
    await page.goto("/ayudar");
    await page.getByRole("link", { name: ui.home.pathHandsCta }).click();

    await expect(page).toHaveURL(/\/contacto$/);
    await expect(page.getByText(help.contact.name, { exact: true })).toBeVisible();

    const mapa = page.getByRole("link", { name: ui.contactPage.mapsCta });

    await expect(mapa).toBeVisible();
    await expect(mapa).toHaveAttribute("href", help.contact.mapsUrl);
    await expect(mapa).toHaveAttribute("target", "_blank");
    await expect(
      mapa.locator("img"),
      "Google lleva su logo al lado del nombre",
    ).toHaveAttribute("src", /google/);
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByText("Riacho He Hé, Formosa", { exact: true })).toBeVisible();
  });

  test("donar dinero lleva a las cuentas de los tres países", async ({ page }) => {
    await page.goto("/ayudar");
    await page.getByRole("link", { name: ui.home.pathMoneyCta }).click();

    await expect(page).toHaveURL(/\/ayudar\/dinero$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      ui.helpPage.moneyTitle,
    );
    await expect(page.getByText(help.accounts.AR.cbu, { exact: true })).toBeVisible();
    await expect(page.getByRole("tablist", { name: ui.home.donateTitle })).toBeVisible();
  });

  test("donar artículos lleva al catálogo de lo que falta", async ({ page }) => {
    await page.goto("/ayudar");
    await page.getByRole("link", { name: ui.home.pathArticlesCta }).click();

    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("el CTA de la home llega a los tres caminos, no a las cuentas", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("region", { name: site.name })
      .getByRole("link", { name: /ayudar a reconstruir/i })
      .click();

    await expect(page).toHaveURL(/\/ayudar$/);
    await expect(page.getByRole("heading", { name: ui.home.pathHands })).toBeVisible();
    await expect(page.getByRole("heading", { name: ui.home.pathMoney })).toBeVisible();
    await expect(page.getByRole("heading", { name: ui.home.pathArticles })).toBeVisible();
  });
});
