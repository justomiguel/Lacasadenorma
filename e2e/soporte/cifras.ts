import type { Page } from "@playwright/test";

/**
 * Leer del sitio las cifras que el sitio publica.
 *
 * Todas las cifras llevan `data-figure`, y eso permite encontrarlas sin depender de
 * la redacción de la etiqueta que tienen al lado. Sirve para las dos direcciones:
 * acá, para sumar lo publicado y comprobar que la aritmética cierra; y en la suite
 * sin datos, para afirmar que no hay **ninguna**.
 */

/** "$ 1.240.000,50" → 1240000.5. Es el formato es-AR que emite `formatMoney`. */
export function montoDe(texto: string): number {
  const limpio = texto
    .replace(/[^\d.,-]/g, "")
    .replaceAll(".", "")
    .replace(",", ".");

  return Number.parseFloat(limpio);
}

/**
 * El valor de una cifra a partir de su etiqueta, recorriendo la relación real de la
 * lista de definiciones: `<dt>` etiqueta, `<dd>` valor. Si algún día el marcado deja
 * de ser un `<dl>`, esto falla, y es correcto que falle: la relación
 * etiqueta-valor es lo que escucha quien usa un lector de pantalla.
 */
export async function cifraPorEtiqueta(page: Page, etiqueta: RegExp): Promise<number> {
  const termino = page.getByRole("term").filter({ hasText: etiqueta }).first();
  const valor = termino.locator("xpath=following-sibling::dd[1]");

  return montoDe(await valor.innerText());
}

/** Todas las cifras de un contenedor, en el orden en que aparecen. */
export async function cifrasDe(page: Page, selector: string): Promise<number[]> {
  const textos = await page.locator(`${selector} [data-figure]`).allInnerTexts();

  return textos.map(montoDe);
}
