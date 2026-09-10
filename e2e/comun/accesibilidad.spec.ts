import { expect, test } from "@playwright/test";

import { esperarSinViolaciones } from "../soporte/axe";
import { PAGINAS_PUBLICAS, VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * Accesibilidad automática en todas las páginas públicas, en dos viewports.
 *
 * Los dos viewports no son redundantes: en 360 px cambian los objetivos táctiles, el
 * contraste de los estados y el orden del contenido, y en la 2.2 hay criterios —foco no
 * tapado, tamaño mínimo del objetivo— que sólo se rompen cuando el espacio aprieta. Un
 * sitio que pasa axe en escritorio y falla en el teléfono falla donde va a usarse.
 *
 * Cero violaciones **no** significa accesible, y conviene que quede escrito acá y no
 * sólo en la documentación: axe no puede juzgar si el orden de lectura tiene sentido, si
 * un `alt` describe la foto, ni si el texto se entiende. Eso se revisa a mano.
 */

test.describe("accesibilidad · WCAG 2.2 AA", () => {
  for (const pagina of PAGINAS_PUBLICAS) {
    test(`${pagina.nombre} no tiene violaciones en el viewport del proyecto`, async ({
      page,
    }) => {
      await page.goto(pagina.path);
      await esperarSinViolaciones(page, `${pagina.path} (viewport del proyecto)`);
    });

    test(`${pagina.nombre} no tiene violaciones en 360 px`, async ({ page }) => {
      await page.setViewportSize(VIEWPORT_MINIMO);
      await page.goto(pagina.path);
      await esperarSinViolaciones(page, `${pagina.path} (360 px)`);
    });
  }
});

test.describe("accesibilidad · lo que axe no puede ver", () => {
  /**
   * El salto al contenido tiene que ser lo primero que recibe el foco. axe comprueba
   * que el enlace exista y esté bien asociado; que sea *el primero* es una decisión de
   * orden que sólo se puede verificar tabulando.
   */
  test("la primera tabulación de cada página lleva al contenido", async ({ page }) => {
    for (const pagina of PAGINAS_PUBLICAS) {
      await page.goto(pagina.path);
      await page.keyboard.press("Tab");

      const enfocado = page.locator(":focus");

      await expect(
        enfocado,
        `en ${pagina.path} el primer foco tiene que ser un enlace`,
      ).toHaveAttribute("href", "#contenido");
    }
  });

  /**
   * Un solo `h1` por página y ningún salto de nivel. axe reporta el orden roto sólo en
   * algunos casos, y una jerarquía saltada convierte la navegación por encabezados
   * —que es cómo se recorre una página larga con un lector de pantalla— en una lista
   * incompleta.
   */
  test("cada página tiene un h1 y la jerarquía de encabezados no salta niveles", async ({
    page,
  }) => {
    for (const pagina of PAGINAS_PUBLICAS) {
      await page.goto(pagina.path);

      await expect(
        page.locator("h1"),
        `${pagina.path} tiene que tener exactamente un h1`,
      ).toHaveCount(1);

      const niveles = await page
        .locator("h1, h2, h3, h4, h5, h6")
        .evaluateAll((nodos) => nodos.map((nodo) => Number(nodo.tagName.slice(1))));

      let anterior = niveles[0] ?? 1;

      for (const nivel of niveles) {
        expect(
          nivel - anterior,
          `${pagina.path} salta del h${String(anterior)} al h${String(nivel)}`,
        ).toBeLessThanOrEqual(1);
        anterior = nivel;
      }
    }
  });

  /**
   * `prefers-reduced-motion` no es una preferencia estética: para algunas personas una
   * transición es un síntoma. Se comprueba que el sistema declare la regla, porque un
   * `transition` suelto en un componente nuevo la saltearía.
   */
  test("con movimiento reducido no queda ninguna transición larga", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const duraciones = await page
      .locator("a, button")
      .evaluateAll((nodos) =>
        nodos.map((nodo) => getComputedStyle(nodo).transitionDuration),
      );

    for (const duracion of duraciones) {
      const segundos = Number.parseFloat(duracion.replace("ms", "").replace("s", ""));

      expect(
        duracion.includes("ms") ? segundos : segundos * 1000,
        "con movimiento reducido ninguna transición pasa de 10 ms",
      ).toBeLessThanOrEqual(10);
    }
  });
});
