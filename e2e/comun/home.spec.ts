import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";
import { VIEWPORT_MINIMO } from "../soporte/paginas";

const { faq, site, ui } = getContent("es");

/**
 * Flujos críticos 1 y 2: abrir la home y entender la campaña.
 *
 * El mockup aprobado (ADR-025) fija la apertura: foto del incendio, el nombre,
 * qué pasó, y las dos acciones. Las nueve preguntas siguen en el HTML servido.
 */

test.describe("flujo 1 · abrir la home", () => {
  test("el nombre, qué pasó y la acción se ven sin desplazarse en 360 px", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await page.goto("/");

    const apertura = page.getByRole("region", { name: site.name });

    const nombre = apertura.getByRole("heading", { level: 1, name: site.name });
    const quePaso = apertura.getByText(ui.home.openingLead, { exact: true });
    const accion = apertura.getByRole("link", { name: /ayudar a reconstruir/i }).first();

    for (const [que, locator] of [
      ["el nombre", nombre],
      ["qué pasó", quePaso],
      ["la acción principal", accion],
    ] as const) {
      await expect(locator, `${que} tiene que ser visible`).toBeVisible();

      const caja = await locator.boundingBox();

      expect(caja, `${que} tiene que tener una caja medible`).not.toBeNull();
      expect(
        caja === null ? Infinity : caja.y + caja.height,
        `${que} tiene que entrar en el primer pliegue de 360×640`,
      ).toBeLessThanOrEqual(VIEWPORT_MINIMO.height);
    }
  });

  test("la apertura tiene la acción primaria y la secundaria del mockup", async ({
    page,
  }) => {
    await page.goto("/");

    const apertura = page.getByRole("region", { name: site.name });

    await expect(
      apertura.getByRole("link", { name: /ayudar a reconstruir/i }),
    ).toHaveCount(1);
    await expect(apertura.getByRole("link", { name: ui.home.knowStory })).toHaveCount(1);
  });

  test("el relato del mockup está en la home", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: ui.home.fireTitle })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: ui.home.communityTitle }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: ui.home.helpTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: ui.home.donateTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: ui.home.nextTitle })).toBeVisible();
  });

  test("el primer pliegue no espera más tipografía que la que dibuja", async ({
    page,
  }) => {
    await page.goto("/");

    const precargas = page.locator('link[rel="preload"][as="font"]');

    await expect(
      precargas,
      "sólo se precargan las tipografías que se dibujan en el primer pliegue (ADR-018)",
    ).toHaveCount(2);
  });
});

test.describe("flujo 2 · entender la campaña", () => {
  test("las nueve preguntas están respondidas en el HTML servido", async ({ page }) => {
    await page.goto("/");

    for (const entrada of faq) {
      await expect(
        page.getByText(entrada.question, { exact: false }).first(),
        `falta la pregunta: ${entrada.question}`,
      ).toBeVisible();

      const primeraRespuesta = entrada.answer[0];

      expect(
        primeraRespuesta,
        "cada pregunta del contenido tiene respuesta",
      ).toBeDefined();

      await expect(
        page.getByText(primeraRespuesta ?? "", { exact: false }).first(),
        `falta la respuesta de: ${entrada.question}`,
      ).toBeVisible();
    }
  });

  test("las respuestas siguen estando sin JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");

    const html = await page.content();

    for (const entrada of faq) {
      expect(
        html,
        `la pregunta tendría que venir en el HTML: ${entrada.question}`,
      ).toContain(entrada.question);
    }

    await context.close();
  });

  test("el recorrido a las páginas del mockup está en la home", async ({ page }) => {
    await page.goto("/");

    for (const destino of ["/norma", "/que-paso", "/ayudar", "/legado", "/contacto"]) {
      await expect(
        page.locator(`a[href="${destino}"]:visible`).first(),
        `la home tiene que enlazar a ${destino}`,
      ).toBeVisible();
    }
  });
});
