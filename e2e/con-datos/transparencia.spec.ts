import { expect, test } from "@playwright/test";

import { cifraPorEtiqueta, montoDe } from "../soporte/cifras";

/**
 * Flujo crítico 7: revisar la rendición de cuentas.
 *
 * Esta página es el argumento entero del proyecto. Un total escrito a mano no vale
 * nada: lo que lo hace verificable es que **la suma del detalle publicado dé
 * exactamente el total publicado** (SC-007). Así que eso es lo que se afirma acá,
 * sumando la tabla fila por fila y comparándola con la cifra de arriba.
 *
 * Si alguna vez esa comparación falla, el sitio está mintiendo aunque los dos números
 * salgan de la base: significa que hay dos caminos de cálculo y uno excluye algo que el
 * otro cuenta —un gasto anulado, uno sin publicar, otra moneda—. El fixture tiene los
 * tres casos a propósito.
 */

test.describe("flujo 7 · revisar la transparencia", () => {
  test("la suma del libro de gastos es exactamente el total gastado", async ({
    page,
  }) => {
    await page.goto("/transparencia");

    const gastado = await cifraPorEtiqueta(page, /^gastado$/i);

    // La última celda de cada fila es el monto. Se leen del `<tbody>` para no arrastrar
    // el encabezado ni el `<caption>`.
    const montos = await page.locator("tbody tr td[data-figure]").allInnerTexts();

    expect(montos.length, "tiene que haber gastos publicados que sumar").toBeGreaterThan(
      0,
    );

    const suma = montos.reduce((total, texto) => total + montoDe(texto), 0);

    expect(suma, "la suma del detalle tiene que ser el total publicado").toBeCloseTo(
      gastado,
      2,
    );
  });

  test("el desglose por rubro suma lo mismo que el total", async ({ page }) => {
    await page.goto("/transparencia");

    const gastado = await cifraPorEtiqueta(page, /^gastado$/i);

    const seccion = page.locator("section", {
      has: page.getByRole("heading", { name: /en qué se gastó/i }),
    });

    const porRubro = await seccion.locator("dd[data-figure]").allInnerTexts();

    expect(porRubro.length, "tiene que haber rubros").toBeGreaterThan(0);

    const suma = porRubro.reduce((total, texto) => total + montoDe(texto), 0);

    expect(suma, "los rubros tienen que cubrir todo el gasto").toBeCloseTo(gastado, 2);
  });

  test("el saldo es la resta, y el recibido no incluye lo anulado", async ({ page }) => {
    await page.goto("/transparencia");

    const recibido = await cifraPorEtiqueta(page, /^recibido en ars$/i);
    const gastado = await cifraPorEtiqueta(page, /^gastado$/i);
    const saldo = await cifraPorEtiqueta(page, /^saldo$/i);

    expect(saldo).toBeCloseTo(recibido - gastado, 2);

    // El fixture tiene un aporte anulado de $ 9.990.000 y un gasto anulado de
    // $ 5.000.000. Ninguna de las tres cifras puede contenerlos, y la forma de
    // afirmarlo sin escribir los totales a mano es que la resta cierre **y** que la
    // suma del detalle cierre: un anulado contado de un solo lado rompe una de las dos.
    expect(recibido).toBeGreaterThan(gastado);
  });

  test("las monedas se informan aparte, sin convertirse", async ({ page }) => {
    await page.goto("/transparencia");

    // El fixture tiene un aporte en dólares. Convertirlo exigiría publicar un tipo de
    // cambio con fecha, y no hay ninguno que podamos sostener.
    await expect(page.getByText(/las monedas no se suman entre sí/i)).toBeVisible();
    await expect(
      page.getByRole("term").filter({ hasText: /recibido en usd/i }),
    ).toHaveCount(1);
  });

  test("el libro es una tabla de datos con encabezados asociados", async ({ page }) => {
    await page.goto("/transparencia");

    const tabla = page.getByRole("table").first();

    await expect(tabla).toBeVisible();

    // El `<caption>` dice cuántos gastos hay y que la suma cierra: es la única pista
    // que recibe quien recorre la página con un lector de pantalla antes de entrar.
    await expect(tabla.locator("caption")).toContainText(/gastos publicados/i);

    // Cada fila tiene su concepto como encabezado de fila: sin eso, un monto leído
    // suelto no dice de qué gasto es.
    const filas = await tabla.locator("tbody tr").count();
    const encabezadosDeFila = await tabla.locator('tbody th[scope="row"]').count();

    expect(encabezadosDeFila).toBe(filas);
  });

  test("dice cuántos comprobantes hay y no publica los archivos", async ({
    page,
    request,
  }) => {
    await page.goto("/transparencia");

    await expect(page.getByText(/comprobantes archivados/i)).toBeVisible();

    // Los comprobantes suelen tener datos de terceros. Que existan es público; el
    // archivo no. Sin sesión, la ruta corta antes de buscar nada: contesta 403 y dice
    // por qué. No redirige a la pantalla de acceso, porque esto devuelve un archivo y un
    // 307 hacia HTML se ve como una descarga corrupta.
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

    // Del fixture: un gasto sin publicar y uno anulado.
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
