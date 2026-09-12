import { expect, test } from "@playwright/test";

/**
 * La rendición pública de cifras se rechazó. Quedan el método, las novedades
 * y que lo no publicado no se filtra. Los comprobantes siguen siendo internos.
 */

test.describe("flujo 7 · transparencia y novedades", () => {
  test("transparencia no publica totales, libro ni avisos de cifras", async ({
    page,
  }) => {
    await page.goto("/transparencia");

    await expect(page.locator("[data-figure]")).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByText(/cuánto entró y cuánto salió/i)).toHaveCount(0);
    await expect(page.getByText(/cada gasto, uno por uno/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
});
