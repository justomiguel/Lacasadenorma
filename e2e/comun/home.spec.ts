import { expect, test } from "@playwright/test";

import { faq, site } from "@/content";

import { VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * Flujos críticos 1 y 2: abrir la home y entender la campaña.
 *
 * Son los dos flujos que deciden si el resto existe. Alguien abre un enlace que le
 * llegó por WhatsApp, y en los primeros segundos decide si esto es real. Lo que se
 * afirma acá es exactamente eso y nada más ambicioso: que el nombre y la acción se ven
 * sin desplazarse en el teléfono más chico, y que las nueve preguntas del proyecto
 * están respondidas **en el HTML servido**.
 *
 * Lo segundo se comprueba con el JavaScript deshabilitado en un caso a propósito. Un
 * acordeón que carga las respuestas al tocarlo pasaría un test de contenido y fallaría
 * el requisito: un buscador y un agente leen lo que vino en la respuesta.
 */

test.describe("flujo 1 · abrir la home", () => {
  test("el nombre, la propuesta y la acción se ven sin desplazarse en 360 px", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await page.goto("/");

    // Todo se busca dentro de la apertura: la propuesta se repite en el pie, y un
    // test que la encuentre allá estaría midiendo el final de la página.
    const apertura = page.getByRole("region", { name: site.name });

    const nombre = apertura.getByRole("heading", { level: 1, name: site.name });
    const propuesta = apertura.getByText(site.tagline, { exact: true });
    const accion = apertura.getByRole("link", { name: /ayudar a reconstruir/i }).first();

    for (const [que, locator] of [
      ["el nombre", nombre],
      ["la propuesta", propuesta],
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

  test("hay una sola acción con forma de botón en la apertura", async ({ page }) => {
    await page.goto("/");

    const apertura = page.getByRole("region", { name: site.name });

    // La segunda acción de la apertura es un enlace de texto, no un botón: dos
    // botones compitiendo diluyen la decisión, y es una regla de `ux.md` que se
    // podría "arreglar" mal en cualquier momento.
    await expect(
      apertura.getByRole("link", { name: /ayudar a reconstruir/i }),
    ).toHaveCount(1);
    await expect(
      apertura.getByRole("link", { name: /conocer la historia de norma/i }),
    ).toHaveCount(1);
  });

  test("el primer pliegue no espera más tipografía que la que dibuja", async ({
    page,
  }) => {
    await page.goto("/");

    // Dos archivos: la serif del relato y la grotesca de la interfaz. Las dos se
    // dibujan en la primera pantalla, así que precargarlas es correcto.
    //
    // El número es la parte importante. Una tercera precarga fue durante un tiempo
    // la itálica de Newsreader, 64 KB en el camino crítico de las nueve páginas para
    // un estilo que sólo aparece dentro del cuerpo de una novedad. El elemento LCP de
    // cada página es su `<h1>`, y su dibujado final espera a que llegue la tipografía:
    // sacarla del preload bajó el LCP de la home de 2,4 s a 2,1 s (ADR-018).
    //
    // Nada más en el proyecto detecta esa regresión. El presupuesto de Lighthouse
    // cuenta scripts, y una tipografía no es un script.
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

  test("el recorrido a las páginas que amplían cada tema está en la home", async ({
    page,
  }) => {
    await page.goto("/");

    for (const destino of [
      "/norma",
      "/que-paso",
      "/reconstruccion",
      "/transparencia",
      "/legado",
      "/riacho-conecta",
    ]) {
      await expect(
        page.locator(`a[href="${destino}"]`).first(),
        `la home tiene que enlazar a ${destino}`,
      ).toBeVisible();
    }
  });
});
