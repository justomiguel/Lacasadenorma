import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";
import { COUNTRY_NAMES } from "@/src/domain/entities";

/**
 * Flujo crítico 4: elegir cómo aportar.
 *
 * Transferencia, Mercado Pago y PayPal, y dentro de transferencia Argentina y
 * Chile. Los datos salen del contenido versionado, no de la base.
 */

const { help, ui } = getContent("es");

test.describe("flujo 4 · elegir el método de aporte", () => {
  test("el selector de canal es un tablist con teclado", async ({ page }) => {
    await page.goto("/ayudar");

    const canales = page.getByRole("tablist", { name: ui.home.donateTitle });

    await expect(canales).toBeVisible();
    await expect(canales.getByRole("tab")).toHaveCount(3);

    await expect(page.getByRole("tabpanel")).toHaveCount(1);

    const primera = canales.getByRole("tab").first();

    await primera.click();
    await expect(primera).toHaveAttribute("aria-selected", "true");
    await expect(primera).toHaveAttribute("tabindex", "0");

    await primera.press("ArrowRight");

    const segunda = canales.getByRole("tab").nth(1);

    await expect(segunda).toHaveAttribute("aria-selected", "true");
    await expect(segunda).toBeFocused();

    await segunda.press("ArrowLeft");
    await expect(primera).toBeFocused();
    await primera.press("ArrowLeft");
    await expect(canales.getByRole("tab").last()).toBeFocused();
  });

  test("Argentina y Chile muestran sus propios datos", async ({ page }) => {
    await page.goto("/ayudar");

    const ancho = page.viewportSize()?.width ?? 0;

    if (ancho >= 1024) {
      await expect(page.getByRole("heading", { name: /argentina/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /chile/i })).toBeVisible();
      await expect(page.getByText(help.accounts.AR.alias, { exact: true })).toBeVisible();
      await expect(page.getByText(help.accounts.CL.rut, { exact: true })).toBeVisible();
      return;
    }

    const paises = page.getByRole("tablist", { name: ui.countryTabsLabel });

    await expect(paises.getByRole("tab")).toHaveCount(2);

    await paises.getByRole("tab", { name: ui.countries.AR }).click();

    const panel = page.getByRole("tabpanel");

    await expect(panel.getByText(help.accounts.AR.alias, { exact: true })).toBeVisible();
    await expect(panel.getByText(help.accounts.AR.cbu, { exact: true })).toBeVisible();

    await paises.getByRole("tab", { name: ui.countries.CL }).click();

    await expect(panel.getByText(help.accounts.CL.rut, { exact: true })).toBeVisible();
    await expect(
      panel.getByText(help.accounts.CL.accountNumber, { exact: true }),
    ).toBeVisible();
  });

  test("Mercado Pago y PayPal se ven y no tienen un botón sin URL", async ({ page }) => {
    await page.goto("/ayudar");

    const canales = page.getByRole("tablist", { name: ui.home.donateTitle });

    await canales.getByRole("tab", { name: ui.home.mercadoPago }).click();
    await expect(page.getByText(ui.home.mercadoPagoLead)).toBeVisible();
    await expect(page.getByRole("link", { name: /mercado pago/i })).toHaveCount(0);

    await canales.getByRole("tab", { name: ui.home.paypal }).click();
    await expect(page.getByText(ui.home.paypalLead)).toBeVisible();
    await expect(page.getByRole("link", { name: /paypal/i })).toHaveCount(0);
  });

  test("sin JavaScript Argentina y Chile vienen completos en el HTML", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/ayudar");

    for (const pais of ["AR", "CL"] as const) {
      await expect(
        page.getByRole("heading", { name: COUNTRY_NAMES[pais] }),
        `sin JavaScript tiene que estar la sección de ${COUNTRY_NAMES[pais]}`,
      ).toBeVisible();
    }

    const valores = await page.locator("[data-figure]").count();

    expect(
      valores,
      "los datos bancarios copiables tienen que venir servidos",
    ).toBeGreaterThanOrEqual(4);

    await context.close();
  });

  test("desde la home se llega a los datos sin cambiar de página", async ({ page }) => {
    await page.goto("/");

    const seccion = page.locator("section", { has: page.getByRole("tablist") }).first();

    await expect(seccion.getByRole("tablist").first()).toBeVisible();
    await expect(
      seccion.getByRole("button", { name: /^copiar$/i }).first(),
    ).toBeVisible();
  });

  test("la advertencia sobre sitios falsos está antes de los datos", async ({ page }) => {
    await page.goto("/ayudar");

    const advertencia = page.getByText(/verificá que estés en el dominio correcto/i);
    const primerDato = page.getByRole("tabpanel").locator("[data-figure]").first();

    await expect(advertencia).toBeVisible();

    const cajaAdvertencia = await advertencia.boundingBox();
    const cajaDato = await primerDato.boundingBox();

    expect(cajaAdvertencia).not.toBeNull();
    expect(cajaDato).not.toBeNull();
    expect(
      cajaAdvertencia?.y ?? 0,
      "la advertencia tiene que leerse antes del primer dato bancario",
    ).toBeLessThan(cajaDato?.y ?? 0);
  });
});
