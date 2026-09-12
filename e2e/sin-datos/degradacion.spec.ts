import { expect, test } from "@playwright/test";

import { PAGINAS_PUBLICAS } from "../soporte/paginas";

/**
 * El sitio sin base de datos.
 *
 * El contenido editorial y las cuentas publicadas viven en el repositorio.
 * Sin base, el sitio igual sirve la campaña. Lo que no puede pasar: un cero,
 * un marcador de relleno, o las secciones financieras que se rechazaron.
 */

const FRASES_RECHAZADAS = [
  "Cuánto entró y cuánto salió",
  "Cada gasto, uno por uno",
  "Cuánto sale cada rubro",
  "Cómo va la obra",
  "No pudimos leer las cifras",
  "No pudimos leer estos datos en este momento.",
  "Volvé a intentar en un rato: el problema es nuestro, no tuyo.",
];

test.describe("sin base de datos · el sitio funciona igual", () => {
  for (const pagina of PAGINAS_PUBLICAS) {
    test(`${pagina.nombre} responde y muestra su contenido`, async ({ page }) => {
      const respuesta = await page.goto(pagina.path);

      expect(respuesta?.status(), `${pagina.path} tiene que responder 200`).toBe(200);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const texto = (await page.locator("main").innerText()).trim();

      expect(
        texto.length,
        `${pagina.path} tendría que tener contenido de lectura`,
      ).toBeGreaterThan(400);
    });
  }

  test("las páginas públicas no muestran las secciones financieras rechazadas", async ({
    page,
  }) => {
    for (const pagina of PAGINAS_PUBLICAS) {
      await page.goto(pagina.path);

      const texto = await page.locator("body").innerText();

      for (const frase of FRASES_RECHAZADAS) {
        expect(texto, `${pagina.path} todavía muestra «${frase}»`).not.toContain(frase);
      }
    }
  });

  test("transparencia no publica cifras ni el aviso de cifras ilegibles", async ({
    page,
  }) => {
    await page.goto("/transparencia");

    await expect(page.locator("[data-figure]")).toHaveCount(0);
    await expect(page.getByText(/no pudimos leer las cifras/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("ayudar publica las cuentas verificadas aunque no haya base", async ({ page }) => {
    await page.goto("/ayudar");

    await expect(page.getByText("justomiguelvargas", { exact: true })).toBeVisible();
    await expect(page.getByText("1430001713005033120017", { exact: true })).toBeVisible();

    const texto = await page.locator("main").innerText();

    for (const marcador of ["PENDIENTE", "XXXX", "0000000000", "CUENTA DE PRUEBA"]) {
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

  test("la API pública informa la indisponibilidad sin romperse", async ({ request }) => {
    for (const capacidad of [
      "campaign-status",
      "donation-methods",
      "reconstruction-progress",
      "transparency-summary",
    ]) {
      const respuesta = await request.get(`/api/public/${capacidad}`);

      expect(
        respuesta.status(),
        `${capacidad} tendría que informar indisponibilidad`,
      ).toBe(503);

      const cuerpo = (await respuesta.json()) as { error?: { code?: string } };

      expect(cuerpo.error?.code).toBe("unavailable");
    }
  });

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
