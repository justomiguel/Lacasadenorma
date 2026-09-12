import { expect, test } from "@playwright/test";

import { getContent } from "@/content/pack";
import { VIEWPORT_MINIMO } from "../soporte/paginas";

const { faq, site, ui } = getContent("es");

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
  /**
   * Las cinco respuestas de la apertura, arriba del pliegue del teléfono más chico.
   *
   * Eran tres —nombre, propuesta y acción— y la propuesta era el eslogan del
   * proyecto, que no dice qué casa ni por qué. ADR-024 §5 fija las cinco: qué
   * ocurrió, a quién estamos ayudando, qué hay que reconstruir, cómo ayudar y cómo
   * compartir.
   *
   * El test es exigente a propósito, porque el presupuesto es de verdad: las cinco
   * cierran a 623 px y el pliegue está en 640. Con la frase del medio en cuatro
   * líneas en lugar de tres, el enlace de compartir se iba 36 px afuera y nada lo
   * notaba. Si esto falla, la pregunta no es cómo apretar más el margen: es qué
   * frase sobra.
   */
  test("las cinco respuestas de la apertura se ven sin desplazarse en 360 px", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await page.goto("/");

    // Todo se busca dentro de la apertura: un test que encuentre estas frases más
    // abajo estaría midiendo el medio de la página.
    const apertura = page.getByRole("region", { name: site.name });

    const nombre = apertura.getByRole("heading", { level: 1, name: site.name });
    const quePaso = apertura.getByText(ui.home.openingLead, { exact: true });
    const aQuien = apertura.getByText(ui.home.openingNeed, { exact: true });
    const accion = apertura.getByRole("link", { name: /ayudar a reconstruir/i }).first();
    const compartir = apertura.getByRole("link", { name: ui.home.shareOpening });

    for (const [que, locator] of [
      ["el nombre", nombre],
      ["qué pasó", quePaso],
      ["a quién estamos ayudando", aQuien],
      ["la acción principal", accion],
      ["cómo compartir", compartir],
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
    await expect(apertura.getByRole("link", { name: ui.home.shareOpening })).toHaveCount(
      1,
    );
  });

  test("compartir se contesta desde la apertura y no catorce pantallas más abajo", async ({
    page,
  }) => {
    await page.goto("/");

    const apertura = page.getByRole("region", { name: site.name });
    const aCompartir = apertura.getByRole("link", { name: ui.home.shareOpening });

    // El destino tiene que existir. Un ancla que apunta a un `id` que nadie escribió
    // no falla: no hace nada, y es exactamente el tipo de rotura que nadie reporta.
    await expect(aCompartir).toHaveAttribute("href", "#compartir");
    await expect(page.locator("#compartir")).toBeAttached();
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
    ]) {
      // `:visible`, y no `.first()`: desde ADR-021 el encabezado también enlaza a
      // estas rutas, pero está oculto abajo de `lg`. Sin el filtro, en el proyecto
      // móvil el primer enlace del documento es uno con `display: none` y el test
      // falla afirmando que la home no enlaza lo que enlaza tres veces.
      await expect(
        page.locator(`a[href="${destino}"]:visible`).first(),
        `la home tiene que enlazar a ${destino}`,
      ).toBeVisible();
    }
  });
});
