import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";

import { VIEWPORT_MINIMO } from "../soporte/paginas";

const { ui } = getContent("es");
const en = getContent("en").ui;

/**
 * PayPal pide dos URLs de retorno. No son páginas de la campaña: no se indexan,
 * no van al menú ni al sitemap, y no publican el monto que PayPal manda en la
 * query. El botón de donar sigue sin publicarse hasta que haya una URL real.
 */

const COMPLETADA = "/ayudar/paypal/completada";
const CANCELADA = "/ayudar/paypal/cancelada";

test.describe("retorno de PayPal", () => {
  test("la completada agradece y no se indexa", async ({ page }) => {
    const respuesta = await page.goto(COMPLETADA);

    expect(respuesta?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      ui.paypalReturn.completed.title,
    );
    await expect(page.getByText(ui.paypalReturn.completed.lead)).toBeVisible();
    await expect(
      page.getByRole("link", { name: ui.paypalReturn.completed.cta }),
    ).toHaveAttribute("href", "/");

    const robots = await page
      .locator('meta[name="robots"]')
      .first()
      .getAttribute("content");

    expect(robots ?? "", "PayPal no es una página para buscar").toMatch(/noindex/i);
  });

  test("la cancelada agradece y llama a volver a intentar", async ({ page }) => {
    const respuesta = await page.goto(CANCELADA);

    expect(respuesta?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      ui.paypalReturn.cancelled.title,
    );
    await expect(page.getByText(/nos sería de mucha ayuda/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: `${ui.paypalReturn.cancelled.cta} →` }),
    ).toHaveAttribute("href", "/ayudar");

    const robots = await page
      .locator('meta[name="robots"]')
      .first()
      .getAttribute("content");

    expect(robots ?? "").toMatch(/noindex/i);
  });

  test("PayPal puede mandar montos en la URL y el sitio no los publica", async ({
    page,
  }) => {
    await page.goto(`${COMPLETADA}?amt=50.00&cc=USD&tx=TESTTXID123&st=Completed`);

    const texto = await page.locator("main").innerText();

    expect(texto).toContain(ui.paypalReturn.completed.title);
    expect(texto, "un monto de la query no es un total publicado").not.toContain("50.00");
    expect(texto).not.toContain("TESTTXID123");
    expect(texto).not.toContain("USD");
  });

  test("en teléfono no aparece la barra de ayudar: el cierre lo pone la página", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);

    for (const path of [COMPLETADA, CANCELADA]) {
      await page.goto(path);

      await expect(
        page.locator("[data-foco-condicional]"),
        `${path} no tiene que duplicar el CTA con la barra del teléfono`,
      ).toHaveCount(0);
    }
  });

  test("el inglés existe y el conmutador se queda en la misma sección", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(COMPLETADA);

    await page.getByRole("banner").getByRole("link", { name: "English" }).click();

    await expect(page).toHaveURL(/\/en\/ayudar\/paypal\/completada$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en.paypalReturn.completed.title,
    );

    await page.getByRole("banner").getByRole("link", { name: "Castellano" }).click();

    await expect(page).toHaveURL(new RegExp(`${COMPLETADA}$`));
  });

  test("no aparecen en el sitemap", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");

    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).not.toContain("/ayudar/paypal/");
  });
});
