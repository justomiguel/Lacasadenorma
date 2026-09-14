import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";
import { COUNTRY_NAMES } from "@/src/domain/entities";

/**
 * Flujo crítico 4: elegir cómo aportar.
 *
 * Una sola decisión —Argentina, Chile o cualquier otro país— y debajo sólo lo que
 * sirve para esa respuesta (ADR-032): la transferencia con sus datos para copiar y
 * el medio de pago del país, o PayPal para el resto del mundo. Los datos salen del
 * contenido versionado, no de la base.
 */

const { help, ui } = getContent("es");

test.describe("flujo 4 · elegir desde dónde aportar", () => {
  test("el selector de país es un tablist con teclado", async ({ page }) => {
    await page.goto("/ayudar");

    const paises = page.getByRole("tablist", { name: ui.home.donateTitle });

    await expect(paises).toBeVisible();
    await expect(paises.getByRole("tab")).toHaveCount(3);

    await expect(page.getByRole("tabpanel")).toHaveCount(1);

    const primera = paises.getByRole("tab").first();

    await primera.click();
    await expect(primera).toHaveAttribute("aria-selected", "true");
    await expect(primera).toHaveAttribute("tabindex", "0");

    await primera.press("ArrowRight");

    const segunda = paises.getByRole("tab").nth(1);

    await expect(segunda).toHaveAttribute("aria-selected", "true");
    await expect(segunda).toBeFocused();

    await segunda.press("ArrowLeft");
    await expect(primera).toBeFocused();
    await primera.press("ArrowLeft");
    await expect(paises.getByRole("tab").last()).toBeFocused();
  });

  test("Argentina y Chile muestran sus propios datos, y nada del otro", async ({
    page,
  }) => {
    await page.goto("/ayudar");

    const paises = page.getByRole("tablist", { name: ui.home.donateTitle });
    const panel = page.getByRole("tabpanel");

    await paises.getByRole("tab", { name: ui.countries.AR }).click();

    await expect(panel.getByText(help.accounts.AR.alias, { exact: true })).toBeVisible();
    await expect(panel.getByText(help.accounts.AR.cbu, { exact: true })).toBeVisible();
    await expect(panel.getByText(help.accounts.CL.rut, { exact: true })).toHaveCount(0);

    await paises.getByRole("tab", { name: ui.countries.CL }).click();

    await expect(panel.getByText(help.accounts.CL.rut, { exact: true })).toBeVisible();
    await expect(
      panel.getByText(help.accounts.CL.accountNumber, { exact: true }),
    ).toBeVisible();
    await expect(panel.getByText(help.accounts.AR.cbu, { exact: true })).toHaveCount(0);
  });

  test("los datos que se copian llevan su acción, y los que se leen no", async ({
    page,
  }) => {
    await page.goto("/ayudar");

    const panel = page.getByRole("tabpanel");

    // Alias, CBU y número de cuenta se copian; titular y CUIT se leen para verificar.
    await expect(panel.locator("[data-figure]")).toHaveCount(3);
    await expect(panel.getByRole("button", { name: /^copiar$/i })).toHaveCount(3);
    await expect(panel.getByText(help.accounts.AR.holder, { exact: true })).toBeVisible();
  });

  test("Mercado Pago distingue Argentina y Chile, y PayPal tiene su enlace", async ({
    page,
  }) => {
    await page.goto("/ayudar");

    const paises = page.getByRole("tablist", { name: ui.home.donateTitle });
    const panel = page.getByRole("tabpanel");

    const arHref = help.mercadoPagoUrl.AR;
    const clHref = help.mercadoPagoUrl.CL;
    const paypalHref = help.paypalUrl;

    expect(arHref).not.toBeNull();
    expect(clHref).not.toBeNull();
    expect(paypalHref).not.toBeNull();

    const ar = panel.locator(`a[href="${arHref ?? ""}"]`);
    const cl = panel.locator(`a[href="${clHref ?? ""}"]`);

    await paises.getByRole("tab", { name: ui.countries.AR }).click();
    await expect(ar).toBeVisible();
    await expect(cl).toHaveCount(0);
    await expect(ar).toHaveAttribute("data-brand", "mercadopago");
    await expect(ar.locator("[data-flag=AR]")).toBeVisible();
    await expect(panel.getByText(ui.home.mercadoPagoLead)).toBeVisible();
    await expect(
      panel
        .getByText(ui.home.mercadoPago, { exact: true })
        .locator("xpath=..")
        .locator("img"),
      "Mercado Pago lleva su logo al lado del nombre",
    ).toHaveAttribute("src", /mercadopago/);

    await paises.getByRole("tab", { name: ui.countries.CL }).click();
    await expect(cl).toBeVisible();
    await expect(ar).toHaveCount(0);
    await expect(cl.locator("[data-flag=CL]")).toBeVisible();
    await expect(cl.locator("[data-flag=AR]")).toHaveCount(0);

    await paises.getByRole("tab", { name: ui.home.international }).click();

    const paypal = panel.getByRole("link", { name: ui.home.paypalCta });

    await expect(paypal).toBeVisible();
    await expect(paypal).toHaveAttribute("href", paypalHref ?? "");
    await expect(paypal).toHaveAttribute("data-brand", "paypal");
    await expect(paypal.locator("[data-flag]")).toHaveCount(0);
    await expect(
      panel.getByText(ui.home.paypal, { exact: true }).locator("xpath=..").locator("img"),
      "PayPal lleva su logo al lado del nombre",
    ).toHaveAttribute("src", /paypal/);
    await expect(panel.getByText(help.accounts.AR.cbu, { exact: true })).toHaveCount(0);
  });

  test("sin JavaScript los tres países vienen completos en el HTML", async ({
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

    await expect(
      page.getByRole("heading", { name: ui.home.international }),
    ).toBeVisible();

    const valores = await page.locator("[data-figure]").count();

    expect(
      valores,
      "los datos bancarios copiables tienen que venir servidos",
    ).toBeGreaterThanOrEqual(4);

    await context.close();
  });

  test("desde la home se llega a los datos sin cambiar de página", async ({ page }) => {
    await page.goto("/");

    const seccion = page.locator("#donaciones");

    await expect(
      seccion.getByRole("tablist", { name: ui.home.donateTitle }),
    ).toBeVisible();
    await expect(
      seccion.getByRole("button", { name: /^copiar$/i }).first(),
    ).toBeVisible();
  });
});
