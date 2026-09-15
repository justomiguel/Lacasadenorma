import { expect, test } from "@playwright/test";

/**
 * La rendición pública habla de plata en porcentajes, no en montos (ADR-040).
 * El 100% de la obra no está publicado. Los comprobantes siguen siendo internos.
 */

test.describe("flujo 7 · transparencia y novedades", () => {
  test("transparencia publica composición de lo recibido, sin montos", async ({
    page,
  }) => {
    await page.goto("/transparencia");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/de lo que ya llegó/i).first()).toBeVisible();
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator("[data-figure]").first()).toBeVisible();

    const texto = await page.locator("main").innerText();

    expect(texto).toMatch(/%/);
    expect(texto).toMatch(/100\s*%/);
    expect(texto).not.toMatch(/\$\s*\d/);
    expect(texto).not.toMatch(/\bARS\b/);
  });

  test("dice cuántos comprobantes hay no se afirma en público, y el archivo no se publica", async ({
    request,
  }) => {
    const respuesta = await request.get(
      "/admin/comprobantes/00000000-0000-4000-8000-000000000000",
      { maxRedirects: 0 },
    );

    expect(respuesta.status()).toBe(403);
    expect(await respuesta.text()).toMatch(/sesión/i);
    expect(respuesta.headers()["content-type"] ?? "").not.toContain("application/pdf");
  });

  test("los borradores y lo anulado no tienen camino de lectura pública", async ({
    page,
  }) => {
    await page.goto("/transparencia");

    const texto = await page.locator("main").innerText();

    expect(texto).not.toContain("pendiente de revisar el comprobante");
    expect(texto).not.toContain("Compra duplicada de chapas");

    await page.goto("/novedades");

    const novedades = await page.locator("main").innerText();

    expect(novedades).not.toContain("Borrador que no tiene que aparecer");
  });

  test("una novedad publicada se puede abrir y compartir por su URL", async ({
    page,
  }) => {
    await page.goto("/novedades");

    const enlace = page.locator('main a[href^="/novedades/"]').first();

    await expect(enlace).toBeVisible();

    const destino = await enlace.getAttribute("href");

    await enlace.click();
    await expect(page).toHaveURL(new RegExp(`${destino ?? ""}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const canonica = await page
      .locator('link[rel="canonical"]')
      .first()
      .getAttribute("href");

    expect(new URL(canonica ?? "", "http://x.test").pathname).toBe(destino);
  });

  test("un borrador responde 404 aunque se adivine la URL", async ({ request }) => {
    const respuesta = await request.get("/novedades/borrador-de-prueba");

    expect(
      respuesta.status(),
      "un borrador accesible por URL directa sería una filtración de las policies",
    ).toBe(404);
  });

  test("el feed lista las publicadas y omite el borrador", async ({ request, page }) => {
    const respuesta = await request.get("/novedades.xml");

    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()["content-type"] ?? "").toContain("application/rss+xml");

    const xml = await respuesta.text();

    expect(xml).toContain("Empezó el montaje del techo");
    expect(xml).toContain("Se retiraron los escombros");
    expect(xml).not.toContain("Borrador que no tiene que aparecer");
    expect(xml.indexOf("empezo-el-techo")).toBeLessThan(
      xml.indexOf("se-retiraron-los-escombros"),
    );

    await page.goto("/novedades");

    const alternate = page.locator('link[rel="alternate"][type="application/rss+xml"]');

    await expect(alternate).toHaveAttribute("href", /novedades\.xml/);
  });
});
