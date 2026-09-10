import { expect, test, type Page } from "@playwright/test";

import { PAGINAS_PUBLICAS, VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * Los criterios medibles del loop de revisión visual (`ux.md` §12).
 *
 * De los diez criterios, tres se pueden medir, y para ésos una captura es peor
 * evidencia que un número: nadie cuenta caracteres por línea a ojo, y un desborde
 * horizontal de tres píxeles no se ve en una captura pero se siente al hacer scroll.
 * Los otros siete se miran, o los sostienen otras suites —el foco y los objetivos
 * táctiles, `accesibilidad.spec.ts`; el copiado en tres toques, el flujo 5; los datos
 * de ejemplo, `check:placeholders`—.
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
 * resuelve en la página pidiéndole al navegador que compute `var(--color-brick)`. Están
 * declarados en `oklch()` y Chromium los serializa como `lab(...)`, así que una
 * constante escrita a mano quedaría atada al formato de serialización de una versión del
 * navegador y fallaría en silencio —contando cero superficies con acento, que es un
 * verde falso— en cuanto cambiara. Se compara el color computado y no la clase de
 * Tailwind por el mismo motivo: la clase dice qué se pidió, el color dice qué se ve.
 */
const TOKENS_DE_ACENTO = ["--color-brick", "--color-brick-strong"];

const MAX_ACENTOS = 3;

/**
 * `ux.md` §1 y §8: lo que este sitio no hace nunca.
 *
 * Es la lista de la firma del template genérico —gradientes, blobs, sombras difusas,
 * cards, esquinas muy redondeadas—, y se comprueba porque es la más fácil de reintroducir
 * sin querer: una utilidad de sombra en un componente nuevo no rompe ningún test y
 * cambia el registro de todo el sitio. Hoy no se puede escribir ninguna de las tres
 * —`--shadow-*` y las escalas de radio están vaciadas con `initial` en `globals.css`
 * (ADR-012)—, así que esta comprobación es lo que avisa si alguien las repone.
 *
 * El radio máximo es el token `--radius-sm`, 2 px: más redondeado se siente "app", no
 * "documento". La sombra tiene que ser exactamente `none` en todo: el único anillo del
 * sistema es un `outline`, no un `box-shadow`.
 */
const RADIO_MAXIMO = 2;

type Medicion = {
  desborde: number;
  prosa: { caracteres: number; texto: string }[];
  acento: string[];
  firmaDeTemplate: string[];
  cifrasSinTabular: string[];
  imagenesSinProporcion: string[];
};

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
    ([acentos, maxCaracteres, radioMaximo]) => {
      const desborde =
        document.documentElement.scrollWidth - document.documentElement.clientWidth;

      const medirProsa = () => {
        const peores: { caracteres: number; texto: string }[] = [];

        for (const bloque of document.querySelectorAll("p, li, dd, blockquote")) {
          const texto = bloque.textContent?.trim() ?? "";

          if (texto.length < 60) {
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

        if (estilo.boxShadow !== "none") {
          firmaDeTemplate.push(`${seña(nodo)}: sombra (${estilo.boxShadow})`);
        }

        if (estilo.filter.includes("blur")) {
          firmaDeTemplate.push(`${seña(nodo)}: desenfoque (${estilo.filter})`);
        }

        const radios = [
          estilo.borderTopLeftRadius,
          estilo.borderTopRightRadius,
          estilo.borderBottomLeftRadius,
          estilo.borderBottomRightRadius,
        ].map((valor) => parseFloat(valor));

        // El anillo de foco redondea a `--radius-sm`, y el elemento enfocado en el
        // momento de la medición no es una card por eso.
        if (
          radios.some((radio) => radio > radioMaximo) &&
          nodo !== document.activeElement
        ) {
          firmaDeTemplate.push(
            `${seña(nodo)}: radio de ${String(Math.max(...radios))} px`,
          );
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

      return {
        desborde,
        prosa: medirProsa(),
        acento,
        firmaDeTemplate,
        cifrasSinTabular,
        imagenesSinProporcion,
      };
    },
    [acentos, MAX_CARACTERES, RADIO_MAXIMO] as [string[], number, number],
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
      `${pagina.path} en ${donde} tiene gradientes, sombras, desenfoques o esquinas de más de ${String(RADIO_MAXIMO)} px (criterio 2)`,
    ).toEqual([]);

    expect(
      cifrasSinTabular,
      `${pagina.path} en ${donde} tiene cifras sin números tabulares, que bailan al actualizarse (criterio 5)`,
    ).toEqual([]);

    expect(
      imagenesSinProporcion,
      `${pagina.path} en ${donde} tiene imágenes sin proporción declarada, que empujan el layout al cargar (criterio 6)`,
    ).toEqual([]);
  }
}

test.describe("revisión visual · ux.md §12", () => {
  test("las once páginas cumplen los criterios medibles en el viewport del proyecto", async ({
    page,
  }) => {
    await revisar(page, "el viewport del proyecto");
  });

  test("las once páginas cumplen los criterios medibles en 360 px", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MINIMO);
    await revisar(page, "360 px");
  });
});
