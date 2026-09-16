import { expect, test, type Page } from "@playwright/test";

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

const { help, site, ui } = getContent("es");

/**
 * El panel del país. `getByRole("tabpanel")` a secas alcanzaría, pero el
 * localizador queda atado al tablist de países por si la página suma otro.
 */
function panelDePais(page: Page) {
  return page
    .getByRole("tablist", { name: ui.home.donateTitle })
    .locator("xpath=following-sibling::*[@role='tabpanel']");
}

test.describe("flujo 4 · elegir desde dónde aportar", () => {
  test("el selector de país es un tablist con teclado", async ({ page }) => {
    await page.goto("/ayudar/dinero");

    const paises = page.getByRole("tablist", { name: ui.home.donateTitle });

    await expect(paises).toBeVisible();
    await expect(paises.getByRole("tab")).toHaveCount(3);
    await expect(
      paises.getByRole("tab", { name: ui.countries.AR }).locator("[data-flag=AR]"),
    ).toBeVisible();
    await expect(
      paises
        .getByRole("tab", { name: ui.home.international })
        .locator("[data-country-mark=INT]"),
    ).toBeVisible();
    await expect(panelDePais(page)).toBeVisible();

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
    await page.goto("/ayudar/dinero");

    const paises = page.getByRole("tablist", { name: ui.home.donateTitle });
    const panel = panelDePais(page);

    await paises.getByRole("tab", { name: ui.countries.AR }).click();

    await expect(panel.getByText(help.accounts.AR.alias, { exact: true })).toBeVisible();
    await expect(panel.getByText(help.accounts.AR.cbu, { exact: true })).toBeVisible();
    await expect(panel.locator('[data-field-mark="CBU"]')).toBeVisible();
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
    await page.goto("/ayudar/dinero");

    const panel = panelDePais(page);

    // Alias, CBU y número de cuenta se copian; titular y CUIT se leen para verificar.
    await expect(panel.locator("[data-figure]")).toHaveCount(3);
    await expect(panel.getByRole("button", { name: /^copiar$/i })).toHaveCount(3);
    await expect(panel.getByText(help.accounts.AR.holder, { exact: true })).toBeVisible();
    await expect(
      panel
        .getByRole("heading", { name: help.accounts.AR.bank, exact: true })
        .locator("img"),
      "Brubank lleva su logo al lado del nombre",
    ).toHaveAttribute("src", /brubank/);
  });

  test("Chile muestra Scotiabank con su logo", async ({ page }) => {
    await page.goto("/ayudar/dinero");

    const paises = page.getByRole("tablist", { name: ui.home.donateTitle });
    const panel = panelDePais(page);

    await paises.getByRole("tab", { name: ui.countries.CL }).click();

    await expect(
      panel
        .getByRole("heading", { name: help.accounts.CL.bank, exact: true })
        .locator("img"),
      "Scotiabank lleva su logo al lado del nombre",
    ).toHaveAttribute("src", /scotiabank/);
  });

  test("Mercado Pago distingue Argentina y Chile, y PayPal tiene su enlace", async ({
    page,
  }) => {
    await page.goto("/ayudar/dinero");

    const paises = page.getByRole("tablist", { name: ui.home.donateTitle });
    const panel = panelDePais(page);

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

    await page.goto("/ayudar/dinero");

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

  test("desde la home se llega al CBU en tres toques", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("region", { name: site.name })
      .getByRole("link", { name: /ayudar a reconstruir/i })
      .click();
    await expect(page).toHaveURL(/\/ayudar$/);

    await page.getByRole("link", { name: ui.home.pathMoneyCta }).click();
    await expect(page).toHaveURL(/\/ayudar\/dinero/);

    await expect(page.getByText(help.accounts.AR.cbu, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^copiar$/i }).first()).toBeVisible();
  });
});
