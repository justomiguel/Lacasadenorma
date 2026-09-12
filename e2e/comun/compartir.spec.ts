import { expect, test, type Page } from "@playwright/test";

import { getContent } from "@/content/pack";
import { PAGINAS_PUBLICAS } from "../soporte/paginas";

const { site } = getContent("es");

/**
 * Flujo crítico 6: compartir la campaña.
 *
 * Es el flujo por el que este proyecto va a existir o no. La mayoría de la gente no va
 * a llegar por un buscador: va a llegar porque alguien le reenvió el enlace por
 * WhatsApp. Y en WhatsApp lo primero que se ve no es el sitio, es la tarjeta de la
 * vista previa: si sale sin título o sin imagen, el enlace parece sospechoso y no se
 * abre.
 *
 * Por eso se afirman las tres cosas que hacen a esa tarjeta —título, descripción e
 * imagen que **resuelve de verdad**— y no sólo que las etiquetas existen. Una etiqueta
 * `og:image` que apunta a un 404 pasa cualquier verificación de presencia y produce
 * exactamente el enlace que nadie toca.
 */

async function contenidoDeMeta(page: Page, propiedad: string): Promise<string | null> {
  return page
    .locator(`meta[property="${propiedad}"], meta[name="${propiedad}"]`)
    .first()
    .getAttribute("content");
}

test.describe("flujo 6 · compartir la campaña", () => {
  for (const pagina of PAGINAS_PUBLICAS) {
    test(`${pagina.nombre} se puede compartir con título, descripción y canónica`, async ({
      page,
    }) => {
      await page.goto(pagina.path);

      const titulo = await contenidoDeMeta(page, "og:title");
      const descripcion = await contenidoDeMeta(page, "og:description");
      const canonica = await page
        .locator('link[rel="canonical"]')
        .first()
        .getAttribute("href");

      expect(titulo, `${pagina.path} necesita og:title`).toBeTruthy();
      expect(titulo).toContain(site.name);

      // Una descripción de menos de cincuenta caracteres es una que quedó a medias:
      // WhatsApp la muestra completa y una línea corta se lee como descuido.
      expect(
        (descripcion ?? "").length,
        `${pagina.path} necesita una og:description con contenido`,
      ).toBeGreaterThan(50);

      expect(canonica, `${pagina.path} necesita canónica`).toBeTruthy();
      expect(new URL(canonica ?? "", "http://x.test").pathname).toBe(pagina.path);
    });
  }

  test("la imagen de la vista previa resuelve y es una imagen de verdad", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    const imagen = await contenidoDeMeta(page, "og:image");

    expect(imagen, "la home necesita og:image").toBeTruthy();

    const respuesta = await request.get(imagen ?? "");

    expect(respuesta.status(), `og:image apunta a ${imagen ?? ""}`).toBe(200);
    expect(respuesta.headers()["content-type"]).toContain("image/");
  });

  test("los enlaces para compartir existen en el HTML, sin depender de JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");

    for (const canal of [
      "wa.me",
      "facebook.com/sharer",
      "linkedin.com/sharing",
      "x.com",
    ]) {
      await expect(
        page.locator(`a[href*="${canal}"]`).first(),
        `falta el enlace para compartir por ${canal}`,
      ).toHaveCount(1);
    }

    await context.close();
  });

  test("la tarjeta declara el idioma y el tipo que corresponden", async ({ page }) => {
    await page.goto("/");

    expect(await contenidoDeMeta(page, "og:locale")).toBe("es_AR");
    expect(await contenidoDeMeta(page, "og:type")).toBe("website");
    expect(await contenidoDeMeta(page, "twitter:card")).toBe("summary_large_image");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  });
});
