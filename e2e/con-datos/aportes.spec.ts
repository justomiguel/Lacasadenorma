import { expect, test } from "@playwright/test";

import { COUNTRY_NAMES } from "@/src/domain/entities";

/**
 * Flujo crítico 4: elegir desde qué país se transfiere.
 *
 * Es el paso anterior al único momento en que alguien arriesga algo. Lo que puede
 * salir mal acá no es que el selector se vea raro: es que alguien de Chile copie un
 * CBU argentino, o que el JavaScript no llegue y la persona se quede mirando una
 * pestaña vacía sin saber que los datos existen.
 *
 * De ahí las dos afirmaciones que importan y que parecen la misma pero no lo son:
 *
 * 1. **Con JavaScript**: hay un `tablist` de verdad, se navega con las flechas, y el
 *    panel visible es el del país elegido y sólo ese.
 * 2. **Sin JavaScript**: los tres países están completos en el HTML servido, uno
 *    debajo del otro. No es un caso hipotético: es lo que ve alguien con una
 *    conexión que cortó a mitad de carga, que es exactamente el perfil de quien abre
 *    un enlace en el interior de Formosa.
 */

const PAISES = ["AR", "CL", "US"] as const;

test.describe("flujo 4 · elegir el método de aporte", () => {
  test("el selector de país es un tablist con teclado", async ({ page }) => {
    await page.goto("/ayudar");

    const tabs = page.getByRole("tablist");

    await expect(tabs).toBeVisible();

    const pestanas = page.getByRole("tab");

    await expect(pestanas).toHaveCount(PAISES.length);

    // Un solo panel visible: dos paneles a la vez es el error que convierte esto en
    // un acordeón y hace que se copie el dato del país equivocado.
    await expect(page.getByRole("tabpanel")).toHaveCount(1);

    const primera = pestanas.first();

    await primera.click();
    await expect(primera).toHaveAttribute("aria-selected", "true");

    // Sólo la pestaña activa está en el orden de tabulación: es lo que permite salir
    // del grupo con un Tab en lugar de recorrer las tres.
    await expect(primera).toHaveAttribute("tabindex", "0");

    await primera.press("ArrowRight");

    const segunda = pestanas.nth(1);

    await expect(segunda).toHaveAttribute("aria-selected", "true");
    await expect(segunda).toBeFocused();

    // Y vuelve en círculo desde la primera hacia atrás, que es lo que dice el patrón.
    await segunda.press("ArrowLeft");
    await expect(primera).toBeFocused();
    await primera.press("ArrowLeft");
    await expect(pestanas.last()).toBeFocused();
  });

  test("cada país muestra su moneda y sus propios datos", async ({ page }) => {
    await page.goto("/ayudar");

    const pestanas = page.getByRole("tab");
    const vistos = new Set<string>();

    for (let indice = 0; indice < PAISES.length; indice += 1) {
      const pestana = pestanas.nth(indice);

      await pestana.click();

      const panel = page.getByRole("tabpanel");
      const texto = await panel.innerText();

      expect(texto.length, "un panel de país no puede quedar vacío").toBeGreaterThan(40);

      // La moneda tiene que estar escrita: "transferir $ 50.000" significa cosas
      // distintas en Buenos Aires y en Santiago.
      expect(texto, "el panel tiene que decir en qué moneda es").toMatch(
        /\b(ARS|CLP|USD)\b/,
      );

      const moneda = /\b(ARS|CLP|USD)\b/.exec(texto)?.[1] ?? "";

      expect(vistos.has(moneda), `dos países comparten el panel de ${moneda}`).toBe(
        false,
      );
      vistos.add(moneda);
    }
  });

  test("sin JavaScript los tres países vienen completos en el HTML", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/ayudar");

    for (const pais of PAISES) {
      await expect(
        page.getByRole("heading", { name: COUNTRY_NAMES[pais] }),
        `sin JavaScript tiene que estar la sección de ${COUNTRY_NAMES[pais]}`,
      ).toBeVisible();
    }

    // Y los datos, no sólo los títulos: al menos un valor copiable por país.
    const valores = await page.locator("[data-figure]").count();

    expect(
      valores,
      "los datos bancarios tienen que venir servidos",
    ).toBeGreaterThanOrEqual(PAISES.length);

    await context.close();
  });

  /**
   * SC-002: como máximo tres toques desde que se abre el sitio hasta tener el dato a
   * la vista. La home trae los métodos, así que el camino corto es: abrir, elegir país,
   * copiar. Se verifica que la home los traiga, porque mover esa sección a otra página
   * rompería el criterio sin romper ningún otro test.
   */
  test("desde la home se llega a los datos sin cambiar de página", async ({ page }) => {
    await page.goto("/");

    const seccion = page.locator("section", { has: page.getByRole("tablist") }).first();

    await expect(seccion.getByRole("tablist")).toBeVisible();
    await expect(
      seccion.getByRole("button", { name: /^copiar$/i }).first(),
    ).toBeVisible();
  });

  test("la advertencia sobre sitios falsos está antes de los datos", async ({ page }) => {
    await page.goto("/ayudar");

    const advertencia = page.getByText(/verificá que estés en el dominio correcto/i);
    // Del panel visible: el país que se muestra depende del idioma del navegador, y los
    // datos de los otros dos están en paneles ocultos, que no tienen caja que medir.
    const primerDato = page.getByRole("tabpanel").locator("[data-figure]").first();

    await expect(advertencia).toBeVisible();

    const cajaAdvertencia = await advertencia.boundingBox();
    const cajaDato = await primerDato.boundingBox();

    expect(cajaAdvertencia).not.toBeNull();
    expect(cajaDato).not.toBeNull();
    expect(
      cajaAdvertencia?.y ?? 0,
      "la advertencia tiene que leerse antes del primer dato bancario",
    ).toBeLessThan(cajaDato?.y ?? 0);
  });
});
