import { expect, test } from "@playwright/test";

/**
 * El idioma es una decisión de estructura: está en la URL, en el HTML y en el
 * conmutador. Esta suite no traduce el sitio; afirma que esas tres cosas
 * coinciden y que cambiar de idioma no cambia de sección (ADR-023).
 */

test.describe("i18n estructural", () => {
  test("la home castellana declara es-AR y no redirige", async ({ page }) => {
    const respuesta = await page.goto("/");

    expect(respuesta?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
    await expect(page).toHaveURL(/\/$/);
  });

  test("la home inglesa declara en y sirve el chrome en inglés", async ({ page }) => {
    await page.goto("/en");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: "Help rebuild" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Castellano" })).toBeVisible();
  });

  test("el conmutador se queda en la misma sección", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/norma");

    await page.getByRole("banner").getByRole("link", { name: "English" }).click();

    await expect(page).toHaveURL(/\/en\/norma$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.getByRole("banner").getByRole("link", { name: "Castellano" }).click();

    await expect(page).toHaveURL(/\/norma$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  });

  test("en /en/ayudar el chrome está en inglés y la barra de ayuda no aparece", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/en/ayudar");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/how to help/i);
    await expect(page.getByRole("link", { name: "Help rebuild" })).toHaveCount(0);
  });

  test("/es redirige a la versión sin prefijo", async ({ page }) => {
    const respuesta = await page.request.get("/es/norma", { maxRedirects: 0 });

    expect(respuesta.status()).toBe(308);
    expect(respuesta.headers()["location"] ?? "").toMatch(/\/norma$/);

    await page.goto("/es/norma");
    await expect(page).toHaveURL(/\/norma$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  });

  test("hreflang de /norma apunta a las dos versiones", async ({ page }) => {
    await page.goto("/norma");

    const es = page.locator('link[rel="alternate"][hreflang="es-AR"]');
    const en = page.locator('link[rel="alternate"][hreflang="en"]');
    const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');

    await expect(es).toHaveAttribute("href", /\/norma$/);
    await expect(en).toHaveAttribute("href", /\/en\/norma$/);
    await expect(xDefault).toHaveAttribute("href", /\/norma$/);
  });
});
