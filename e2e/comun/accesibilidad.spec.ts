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
   * El foco tiene que verse en todo lo que lo recibe, y ésta es la comprobación que
   * cierra el criterio 7 de `ux.md` §12.
   *
   * axe no la hace: no tiene ninguna regla de foco visible, porque para juzgarlo hay que
   * enfocar cada elemento y mirar qué cambió, y eso no se deduce del árbol. Y no
   * alcanza con que el sistema declare `:focus-visible` una vez en `globals.css` —eso ya
   * está—: un componente que escriba `outline-none` para "limpiar" un botón, o que se
   * dibuje encima con `overflow: hidden`, lo anula sólo para él. Por eso se recorre con
   * Tab, que es como se recorre de verdad: `:focus-visible` no se activa igual con un
   * `focus()` de script, así que un recorrido programático mediría otra cosa.
   *
   * Mide el grosor y el estilo, **no el color**, y no por descuido: `transition-colors`
   * de Tailwind 4 incluye `outline-color`, así que el anillo entra con un desvanecido de
   * 150 ms y `getComputedStyle` leído enseguida devuelve un color a mitad de camino
   * —el del texto del elemento, que en el botón de aportar es casi el del papel—. Una
   * aserción sobre el color mediría el momento de la lectura y no el sistema. El grosor
   * y el estilo no se animan, y son lo que distingue un anillo presente de uno anulado.
   */
  test("el foco se ve en todo lo que lo recibe, recorrido con Tab", async ({ page }) => {
    for (const pagina of PAGINAS_PUBLICAS) {
      await page.goto(pagina.path);
      await page.keyboard.press("Tab");

      let paradas = 0;

      // Tope de seguridad: si algo captura el foco en un ciclo, el test tiene que
      // fallar por el tope y no colgarse hasta el timeout de la suite.
      for (let paso = 0; paso < 120; paso += 1) {
        const anillo = await page.evaluate(() => {
          const nodo = document.activeElement;

          if (
            nodo === null ||
            nodo === document.body ||
            nodo === document.documentElement
          ) {
            return null;
          }

          // El recorrido termina cuando el foco vuelve al primer elemento, y para
          // saberlo hay que marcar *ese nodo*. Identificarlo por su texto no sirve: la
          // home tiene cinco botones "Copiar", y el segundo cortaba el recorrido a un
          // tercio de la página, con el test en verde.
          if (nodo.hasAttribute("data-primer-foco")) {
            return "vuelta";
          }

          const primero = document.querySelector("[data-primer-foco]");

          if (primero === null) {
            nodo.setAttribute("data-primer-foco", "");
          }

          nodo.setAttribute("data-foco-visitado", "");

          const estilo = getComputedStyle(nodo);

          return {
            seña: `${nodo.tagName.toLowerCase()}:${(nodo.textContent ?? "").trim().slice(0, 40)}`,
            grosor: parseFloat(estilo.outlineWidth),
            estilo: estilo.outlineStyle,
          };
        });

        if (anillo === null || anillo === "vuelta") {
          break;
        }

        paradas += 1;

        expect(
          anillo.grosor >= 2 && anillo.estilo !== "none" && anillo.estilo !== "hidden",
          `en ${pagina.path}, "${anillo.seña}" recibe el foco sin anillo visible (outline ${String(anillo.grosor)}px ${anillo.estilo})`,
        ).toBe(true);

        await page.keyboard.press("Tab");
      }

      /**
       * El recorrido tiene que pasar por todo lo enfocable, y el número se calcula en la
       * página en lugar de escribirse acá. Un umbral a mano —"más de quince paradas"— se
       * calibra con la página más chica y deja de significar nada en las demás; contra el
       * DOM, la comprobación es la misma en las once y avisa si algún control queda fuera
       * del orden de tabulación.
       */
      const sinVisitar = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]",
          ),
        ]
          .filter(
            // `tabIndex >= 0` y no un selector de atributo: los tabs de país usan
            // tabindex rotatorio —el inactivo queda en −1 y se entra al grupo con las
            // flechas, que es la práctica correcta—, y `:not([tabindex="-1"])` no los
            // descarta, porque igual son `button`.
            //
            // `getClientRects()` y no `offsetParent`: en un elemento `position: fixed`
            // —la barra de ayuda del teléfono— `offsetParent` es `null`, y la barra
            // habría quedado fuera de la cuenta justo en el viewport donde existe.
            // `data-foco-condicional` marca los contenedores que aparecen y desaparecen
            // con el scroll: hoy, la barra de ayuda del teléfono. Al final de una página
            // larga la acción primaria queda a la vista, la barra se retira y su enlace
            // nunca recibe el foco —y no se pierde nada, porque lo que ofrece es lo que
            // está en pantalla—. Sin esta excepción la comprobación acusaría un control
            // fuera del orden de tabulación que sí está en el orden de tabulación.
            (nodo) =>
              nodo.tabIndex >= 0 &&
              nodo.getClientRects().length > 0 &&
              nodo.closest("[data-foco-condicional]") === null &&
              !nodo.hasAttribute("data-foco-visitado"),
          )
          .map(
            (nodo) =>
              `${nodo.tagName.toLowerCase()}:${(nodo.textContent ?? "").trim().slice(0, 32)}`,
          ),
      );

      expect(
        sinVisitar,
        `en ${pagina.path} el recorrido con Tab hizo ${String(paradas)} paradas y dejó elementos enfocables sin visitar`,
      ).toEqual([]);
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

    /**
     * Los estilos se leen en un solo `evaluate` sobre `querySelectorAll`, y no con
     * `evaluateAll` sobre un locator. La diferencia es una carrera: un locator resuelve
     * los nodos en una llamada y los evalúa en otra, y si React reemplaza uno en el
     * medio, `getComputedStyle` de un nodo desprendido devuelve la cadena vacía. Eso
     * daba `NaN`, que la comparación reportaba como una transición demasiado larga: una
     * falla intermitente que además acusaba a la página del problema equivocado. Acá el
     * recorrido es sincrónico y no hay ventana donde el DOM pueda cambiar.
     */
    const duraciones = await page.evaluate(() =>
      [...document.querySelectorAll("a, button")].map(
        (nodo) => getComputedStyle(nodo).transitionDuration,
      ),
    );

    expect(
      duraciones.length,
      "la home tiene enlaces y botones que medir",
    ).toBeGreaterThan(0);

    for (const duracion of duraciones) {
      const segundos = Number.parseFloat(duracion.replace("ms", "").replace("s", ""));

      expect(
        duracion.includes("ms") ? segundos : segundos * 1000,
        `con movimiento reducido ninguna transición pasa de 10 ms; se midió "${duracion}"`,
      ).toBeLessThanOrEqual(10);
    }
  });
});
