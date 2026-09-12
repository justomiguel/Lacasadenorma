import { expect, test, type Page } from "@playwright/test";

import { PAGINAS_PUBLICAS, VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * Los criterios medibles del loop de revisión visual (`ux.md` §12).
 *
 * De los diez criterios, seis se pueden medir, y para ésos una captura es peor
 * evidencia que un número: nadie cuenta caracteres por línea a ojo, y un desborde
 * horizontal de tres píxeles no se ve en una captura pero se siente al hacer scroll.
 * Los otros cuatro se miran, o los sostienen otras suites —el foco y los objetivos
 * táctiles, `accesibilidad.spec.ts`; el copiado en tres toques, `con-datos/aportes.spec.ts`;
 * los datos de ejemplo, `check:placeholders`—.
 *
 * Están acá y no en un script aparte para que corran en CI con el sitio ya construido
 * y la base ya cargada, sin orquestar nada nuevo, y para que la regla exista una sola
 * vez. Los tres se rompieron de verdad, y ninguno se veía mirando el CSS:
 * `--container-measure` decía 68 caracteres y entregaba 104.
 *
 * Cada test recorre las once páginas en lugar de haber uno por página: son once gotos
 * y una medición, y partirlos en veintidós tests agrega más arranque que cobertura. El
 * mensaje de cada aserción dice en qué página falló.
 */

/** `ux.md` §2: la prosa no pasa de 68 caracteres por línea. */
const MAX_CARACTERES = 68;

/**
 * `ux.md` §3: como máximo tres superficies con relleno de acento por pantalla.
 *
 * Los tokens se nombran, y el color con el que se compara **no** se escribe acá: se
 * resuelve en la página pidiéndole al navegador que compute `var(--color-aqua)`. Están
 * declarados en `oklch()` y Chromium los serializa como `lab(...)`, así que una
 * constante escrita a mano quedaría atada al formato de serialización de una versión del
 * navegador y fallaría en silencio —contando cero superficies con acento, que es un
 * verde falso— en cuanto cambiara. Se compara el color computado y no la clase de
 * Tailwind por el mismo motivo: la clase dice qué se pidió, el color dice qué se ve.
 */
const TOKENS_DE_ACENTO = ["--color-aqua", "--color-aqua-strong"];

const MAX_ACENTOS = 3;

/**
 * Criterio 11: cuántos huecos de foto reservados tiene cada página, exactamente.
 *
 * El número es **exacto** y no un máximo, a propósito. Cada entrada distinta de cero
 * es una foto que todavía no existe y está anotada en `docs/content-guide.md` §3; si
 * la foto llega y alguien la ubica, este test falla y obliga a bajar el número, que
 * es la única forma de que la tabla no envejezca en silencio.
 *
 * Las páginas que no están acá no reservan ningún hueco.
 */
const ESPACIOS_RESERVADOS = new Map<string, number>([
  // Vacío desde ADR-024, y el mapa se queda: es el lugar donde se anota un hueco
  // nuevo, y que esté vacío es la afirmación de que no hay ninguno. Los dos que
  // había esperaban la foto de Norma en la radio, que `content-guide.md` §3 marca
  // como «si existe»; un hueco es honesto como estado transitorio, no como layout.
]);

type Medicion = {
  desborde: number;
  prosa: { caracteres: number; texto: string }[];
  acento: string[];
  firmaDeTemplate: string[];
  cifrasSinTabular: string[];
  imagenesSinProporcion: string[];
  espaciosReservados: number;
  versales: string[];
};

/**
 * Criterio 14: el acento del sistema no es cálido (ADR-024).
 *
 * El acento pasó de terracota a verde agua, y el riesgo real no es que alguien escriba
 * `text-brick` —esa utilidad ya no existe y no pinta nada—, sino que alguien vuelva a
 * poner un naranja en el token y el sitio entero regrese al default sin que falle una
 * sola aserción.
 *
 * El color se **rasteriza en un canvas** en lugar de leerse del estilo computado, y eso
 * es lo que hace que la comprobación no dependa del navegador: los tokens están en
 * `oklch()` y Chromium los serializa como `lab(...)`, así que parsear la cadena ataría
 * el test a un formato de serialización. Un pixel es un pixel.
 */
async function acentoEsCalido(page: Page): Promise<{ r: number; b: number }> {
  return page.evaluate((token) => {
    const sonda = document.createElement("span");

    document.body.append(sonda);
    sonda.style.color = `var(${token})`;

    const computado = getComputedStyle(sonda).color;

    sonda.remove();

    const lienzo = document.createElement("canvas");

    lienzo.width = 1;
    lienzo.height = 1;

    const contexto = lienzo.getContext("2d");

    if (contexto === null) {
      throw new Error("sin contexto 2d para rasterizar el acento");
    }

    contexto.fillStyle = computado;
    contexto.fillRect(0, 0, 1, 1);

    const [r, , b] = contexto.getImageData(0, 0, 1, 1).data;

    return { r: r ?? 0, b: b ?? 0 };
  }, TOKENS_DE_ACENTO[0] ?? "--color-aqua");
}

async function medir(page: Page): Promise<Medicion> {
  const acentos = await page.evaluate((tokens) => {
    const sonda = document.createElement("span");

    document.body.append(sonda);

    const valores = tokens.map((token) => {
      sonda.style.color = `var(${token})`;

      return getComputedStyle(sonda).color;
    });

    sonda.remove();

    return valores;
  }, TOKENS_DE_ACENTO);

  return page.evaluate(
    ([acentos, maxCaracteres]) => {
      const desborde =
        document.documentElement.scrollWidth - document.documentElement.clientWidth;

      const medirProsa = () => {
        const peores: { caracteres: number; texto: string }[] = [];

        for (const bloque of document.querySelectorAll("p, li, dd, blockquote")) {
          const texto = bloque.textContent?.trim() ?? "";

          if (texto.length < 60) {
            continue;
          }

          if (bloque.classList.contains("font-hand")) {
            continue;
          }

          // Sólo bloques cuyo texto es una sola corrida de líneas. Un `li` que contiene
          // una fecha, un título y un resumen en bloques separados tiene un `textContent`
          // que nunca fue una línea, y medirlo da números inventados: así aparecían "154
          // caracteres" en la lista de novedades.
          const tieneHijosEnBloque = [...bloque.children].some((hijo) => {
            const modo = getComputedStyle(hijo).display;

            return modo !== "inline" && modo !== "inline-block" && modo !== "contents";
          });

          if (tieneHijosEnBloque) {
            continue;
          }

          const estilo = getComputedStyle(bloque);
          const lienzo = document.createElement("canvas").getContext("2d");

          if (lienzo === null) {
            continue;
          }

          // El ancho de un carácter, medido en la tipografía que se está usando y con el
          // texto que de verdad hay. `1ch` en CSS es el ancho de avance del «0», bastante
          // más ancho que el carácter promedio del castellano, y medir con `ch` es lo que
          // dejaba pasar líneas de 104 caracteres creyendo que eran 68.
          lienzo.font = `${estilo.fontSize} ${estilo.fontFamily}`;

          const anchoCaracter = lienzo.measureText(texto).width / texto.length;
          const anchoCaja =
            bloque.getBoundingClientRect().width -
            parseFloat(estilo.paddingLeft) -
            parseFloat(estilo.paddingRight);
          const caracteres = Math.round(anchoCaja / anchoCaracter);

          if (caracteres > maxCaracteres) {
            peores.push({ caracteres, texto: texto.slice(0, 60) });
          }
        }

        return peores;
      };

      const sobreElPliegue = (nodo: Element) => {
        const caja = nodo.getBoundingClientRect();

        return caja.top < window.innerHeight && caja.bottom > 0 && caja.width > 0;
      };

      // Superficies **rellenas** con el acento, no todo lo que lleva el token (`ux.md`
      // §3). Contar también el color del texto y la regla del subrayado hacía que cada
      // enlace fuera un elemento de acento: `/novedades` acusaba cuatro y dos eran los
      // títulos de la lista, exactamente donde un enlace tiene que estar. Contar los
      // enlaces convierte el criterio en "no más de tres enlaces por pantalla", que en
      // una página editorial no es una regla, es un error.
      const acento = [...document.querySelectorAll("body *")]
        .filter(
          (nodo) =>
            sobreElPliegue(nodo) &&
            acentos.includes(getComputedStyle(nodo).backgroundColor),
        )
        .map(
          (nodo) =>
            `${nodo.tagName.toLowerCase()}:${(nodo.textContent ?? "").trim().slice(0, 32)}`,
        );

      const seña = (nodo: Element) =>
        `${nodo.tagName.toLowerCase()}${nodo.className ? `.${String(nodo.className).split(" ")[0]}` : ""}`;

      const firmaDeTemplate: string[] = [];

      for (const nodo of document.querySelectorAll("body *")) {
        const estilo = getComputedStyle(nodo);

        if (estilo.backgroundImage.includes("gradient")) {
          firmaDeTemplate.push(`${seña(nodo)}: gradiente (${estilo.backgroundImage})`);
        }

        if (estilo.filter.includes("blur")) {
          firmaDeTemplate.push(`${seña(nodo)}: desenfoque (${estilo.filter})`);
        }
      }

      // Criterio 5. Un monto que baila al actualizarse transmite descuido, y acá los
      // números son el argumento.
      const cifrasSinTabular = [...document.querySelectorAll("[data-figure]")]
        .filter(
          (nodo) => !getComputedStyle(nodo).fontVariantNumeric.includes("tabular-nums"),
        )
        .map(
          (nodo) => `${seña(nodo)}: "${(nodo.textContent ?? "").trim().slice(0, 24)}"`,
        );

      // Criterio 6. Una imagen sin proporción declarada empuja el contenido cuando
      // carga, y eso se paga en CLS y en la sensación de que el sitio se está armando
      // encima del lector.
      const imagenesSinProporcion = [...document.querySelectorAll("img")]
        .filter(
          (imagen) =>
            !imagen.hasAttribute("width") ||
            !imagen.hasAttribute("height") ||
            getComputedStyle(imagen).aspectRatio === "auto",
        )
        .map((imagen) => `img[src="${imagen.getAttribute("src")?.slice(0, 40) ?? ""}"]`);

      // Criterio 13. La sobrelínea en VERSALES espaciada arriba de cada título es uno
      // de los delatores de página generada que documenta la skill `frontend-design`,
      // y el sitio la tenía en las treinta y nueve secciones que tenía (ADR-021).
      // Se mide el estilo computado y no la clase: lo que importa es lo que se ve.
      const versales = [...document.querySelectorAll("body *")]
        .filter((nodo) => {
          const texto = (nodo.textContent ?? "").trim();

          return (
            texto.length > 0 &&
            getComputedStyle(nodo).textTransform === "uppercase" &&
            nodo.closest("header") === null &&
            !nodo.hasAttribute("data-kicker") &&
            nodo.closest("[data-kicker]") === null &&
            (nodo.parentElement === null ||
              getComputedStyle(nodo.parentElement).textTransform !== "uppercase")
          );
        })
        .map(
          (nodo) => `${seña(nodo)}: "${(nodo.textContent ?? "").trim().slice(0, 32)}"`,
        );

      return {
        desborde,
        prosa: medirProsa(),
        acento,
        firmaDeTemplate,
        cifrasSinTabular,
        imagenesSinProporcion,
        espaciosReservados: document.querySelectorAll("[data-espacio-reservado]").length,
        versales,
      };
    },
    [acentos, MAX_CARACTERES] as [string[], number],
  );
}

async function revisar(page: Page, donde: string) {
  for (const pagina of PAGINAS_PUBLICAS) {
    await page.goto(pagina.path);

    const {
      desborde,
      prosa,
      acento,
      firmaDeTemplate,
      cifrasSinTabular,
      imagenesSinProporcion,
      espaciosReservados,
      versales,
    } = await medir(page);

    expect(
      desborde,
      `${pagina.path} en ${donde} desborda ${String(desborde)} px a lo ancho (criterio 10)`,
    ).toBeLessThanOrEqual(0);

    expect(
      prosa,
      `${pagina.path} en ${donde} tiene prosa de más de ${String(MAX_CARACTERES)} caracteres por línea (criterio 4)`,
    ).toEqual([]);

    expect(
      acento.length,
      `${pagina.path} en ${donde} tiene ${String(acento.length)} superficies con acento sobre el pliegue (criterio 3): ${acento.join(" · ")}`,
    ).toBeLessThanOrEqual(MAX_ACENTOS);

    expect(
      firmaDeTemplate,
      `${pagina.path} en ${donde} tiene gradientes o desenfoques (criterio 2)`,
    ).toEqual([]);

    expect(
      cifrasSinTabular,
      `${pagina.path} en ${donde} tiene cifras sin números tabulares, que bailan al actualizarse (criterio 5)`,
    ).toEqual([]);

    expect(
      imagenesSinProporcion,
      `${pagina.path} en ${donde} tiene imágenes sin proporción declarada, que empujan el layout al cargar (criterio 6)`,
    ).toEqual([]);

    expect(
      espaciosReservados,
      `${pagina.path} en ${donde} reserva ${String(espaciosReservados)} huecos de foto (criterio 11). ` +
        `Si el material ya está, ubicalo; si de verdad falta, anotalo en docs/content-guide.md §3 y acá`,
    ).toBe(ESPACIOS_RESERVADOS.get(pagina.path) ?? 0);

    expect(
      versales,
      `${pagina.path} en ${donde} tiene texto en versales fuera de las etiquetas del mockup (criterio 13): ${versales.join(" · ")}`,
    ).toEqual([]);

    const { r, b } = await acentoEsCalido(page);

    expect(
      b,
      `${pagina.path} en ${donde}: el acento del sistema es cálido, rgb tiene r=${String(r)} y b=${String(b)} (criterio 14). ` +
        `El acento es el verde bosque del mockup; un naranja acá devuelve el sitio al default`,
    ).toBeGreaterThan(r);
  }
}

test.describe("revisión visual · ux.md §12", () => {
  test("las diez páginas cumplen los criterios medibles en el viewport del proyecto", async ({
    page,
  }) => {
    await revisar(page, "el viewport del proyecto");
  });

  test("las diez páginas cumplen los criterios medibles en 360 px", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await revisar(page, "360 px");
  });

  /**
   * Criterio 12: la home rompe el plano.
   *
   * Es el criterio que resume el diagnóstico de ADR-021. Once páginas compartían un
   * único contenedor centrado sobre un único fondo, y ninguna medición existente lo
   * notaba: cada regla se cumplía y el conjunto se leía como una plantilla. Se piden
   * las dos cosas que lo rompen —una foto que llega al borde y más de una superficie—
   * en 360 px, que es donde llega la mayoría.
   */
  test("la home tiene una foto que llega al borde y más de una superficie (criterio 12)", async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await page.goto("/");

    const { sangradas, superficies } = await page.evaluate(() => {
      // El ancho de referencia es el del `body`, no el del viewport:
      // `scrollbar-gutter: stable` reserva el canal de la barra de desplazamiento, así
      // que el elemento más ancho posible del documento mide hasta 15 px menos que la
      // pantalla. Medir contra el viewport daba «ninguna foto sangra» en Chrome de
      // escritorio y «sangra» en los otros dos, que es la peor clase de test.
      const ancho = document.body.clientWidth;

      const sangradas = [...document.querySelectorAll("main img")]
        .filter((imagen) => imagen.getBoundingClientRect().width >= ancho - 1)
        .map((imagen) => imagen.getAttribute("src")?.slice(0, 40) ?? "");

      // El fondo de la página cuenta como una superficie: lo que se mide es cuántas
      // hay, no cuántas bandas se agregaron.
      const superficies = new Set([getComputedStyle(document.body).backgroundColor]);

      for (const nodo of document.querySelectorAll("main *")) {
        const fondo = getComputedStyle(nodo).backgroundColor;

        if (fondo !== "rgba(0, 0, 0, 0)" && nodo.getBoundingClientRect().width > 320) {
          superficies.add(fondo);
        }
      }

      return { sangradas, superficies: [...superficies] };
    });

    expect(
      sangradas.length,
      "la home tiene que tener al menos una foto al ancho de la pantalla en 360 px",
    ).toBeGreaterThan(0);

    expect(
      superficies.length,
      `la home tiene que tener más de una superficie de sección: ${superficies.join(" · ")}`,
    ).toBeGreaterThan(1);
  });
});
