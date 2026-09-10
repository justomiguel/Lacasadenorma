import { expect, test } from "@playwright/test";

import { UNAVAILABLE_MESSAGES } from "@/src/application/result";

import { PAGINAS_PUBLICAS } from "../soporte/paginas";

/**
 * El sitio sin base de datos.
 *
 * Esta suite corre con el sitio **deliberadamente desconectado** de Supabase, y es la
 * única verificación automática de FR-034 y SC-012: un clon nuevo del repositorio, sin
 * una sola credencial, levanta y sirve el contenido editorial completo.
 *
 * No es un caso de borde. Es el estado en el que va a estar el proyecto la primera vez
 * que alguien lo abra, y el estado al que va a volver si un día se cae la base. Las dos
 * formas de fallar acá son igual de graves y opuestas: reventar con un error, o mostrar
 * un cero. Un cero es una afirmación sobre el mundo —"no juntamos nada", "no gastamos
 * nada"— y en una campaña de recaudación es una afirmación falsa que destruye confianza.
 *
 * Así que lo que se afirma es: la página responde 200, el contenido humano está entero,
 * y donde iría una cifra hay una explicación con palabras.
 */

test.describe("sin base de datos · el sitio funciona igual", () => {
  for (const pagina of PAGINAS_PUBLICAS) {
    test(`${pagina.nombre} responde y muestra su contenido`, async ({ page }) => {
      const respuesta = await page.goto(pagina.path);

      expect(respuesta?.status(), `${pagina.path} tiene que responder 200`).toBe(200);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Ninguna página puede quedar en un esqueleto: el contenido editorial no
      // depende de la base y tiene que estar completo.
      const texto = (await page.locator("main").innerText()).trim();

      expect(
        texto.length,
        `${pagina.path} tendría que tener contenido de lectura`,
      ).toBeGreaterThan(400);
    });
  }

  test("donde iría una cifra hay una explicación, nunca un cero", async ({ page }) => {
    await page.goto("/transparencia");

    await expect(
      page.getByText(UNAVAILABLE_MESSAGES["not-configured"]).first(),
    ).toBeVisible();

    // Y no hay ningún monto renderizado. Las cifras del sitio llevan `data-figure`,
    // así que su ausencia se puede afirmar sin adivinar por texto.
    await expect(page.locator("[data-figure]")).toHaveCount(0);
  });

  test("la sección de aportes explica que todavía no hay cuenta publicada", async ({
    page,
  }) => {
    await page.goto("/ayudar");

    await expect(
      page.getByText(UNAVAILABLE_MESSAGES["not-configured"]).first(),
    ).toBeVisible();

    // Lo que no puede pasar de ninguna manera: que aparezca algo con forma de dato
    // bancario. Ni un ejemplo, ni un marcador de relleno.
    const texto = await page.locator("main").innerText();

    for (const marcador of ["PENDIENTE", "XXXX", "0000000000", "CBU:"]) {
      expect(texto, `apareció un marcador de relleno: ${marcador}`).not.toContain(
        marcador,
      );
    }
  });

  test("las novedades explican la ausencia en lugar de mostrar una lista vacía", async ({
    page,
  }) => {
    await page.goto("/novedades");

    const texto = await page.locator("main").innerText();

    expect(texto.length).toBeGreaterThan(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  /**
   * Las capacidades de lectura para agentes tienen que contestar lo mismo que la
   * página: que el dato no está disponible y por qué. Una API que devuelve 500 cuando
   * la página muestra un aviso es una inconsistencia que un agente no puede resolver.
   */
  test("la API pública informa la indisponibilidad sin romperse", async ({ request }) => {
    for (const capacidad of [
      "campaign-status",
      "donation-methods",
      "reconstruction-progress",
      "transparency-summary",
    ]) {
      const respuesta = await request.get(`/api/public/${capacidad}`);

      // 503 y no 200 con ceros: un cero devuelto como dato real es una mentira que el
      // consumidor no puede detectar.
      expect(
        respuesta.status(),
        `${capacidad} tendría que informar indisponibilidad`,
      ).toBe(503);

      const cuerpo = (await respuesta.json()) as { error?: { code?: string } };

      expect(cuerpo.error?.code).toBe("unavailable");
    }
  });

  /**
   * La historia de Norma no depende de la base: es contenido versionado en el
   * repositorio. Tiene que contestar 200 incluso acá, y eso distingue "no hay cifras"
   * de "no hay nada".
   */
  test("la historia de Norma se sirve igual, porque no depende de la base", async ({
    request,
  }) => {
    const respuesta = await request.get("/api/public/norma-story");

    expect(respuesta.status()).toBe(200);
  });

  test("el endpoint de salud dice de qué fuente está leyendo", async ({ request }) => {
    const respuesta = await request.get("/api/health");
    const cuerpo = (await respuesta.json()) as { dataSource?: string };

    expect(respuesta.status()).toBe(200);
    expect(cuerpo.dataSource).toBe("content-only");
  });
});
