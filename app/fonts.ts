import { Archivo, Newsreader } from "next/font/google";

/**
 * Dos voces, elegidas deliberadamente (ux.md §2).
 *
 * Se autoalojan con `next/font`: sin pedidos a terceros, sin FOUT y sin un
 * origen más en la CSP. Ambas son variables, así que un solo archivo por familia
 * cubre todo el rango de pesos.
 */

/** Serif con eje óptico, diseñada para leer en pantalla. La voz del relato. */
export const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
  style: ["normal"],
});

/**
 * La itálica va en una declaración aparte por una sola razón: `preload` es por
 * declaración y no por estilo, así que pedir `style: ["normal", "italic"]` ponía
 * los dos archivos en el `<link rel="preload">` de todas las páginas. El de la
 * itálica es el más grande de los tres (64 KB de 158 KB) y hoy no se dibuja una
 * sola letra con él: la itálica aparece únicamente cuando el cuerpo de una novedad
 * usa `*énfasis*`, y no hay novedades publicadas.
 *
 * Costaba, medido con Lighthouse, casi toda la diferencia entre 0.94 y 0.98 de
 * performance: el LCP de cada página es el `<h1>`, y su pintado final espera a que
 * termine de bajar la tipografía con la que se dibuja.
 *
 * Con `preload: false` la regla `@font-face` sigue declarada, así que el navegador
 * baja el archivo si encuentra un `<em>` y no lo baja si no. No hace falta ninguna
 * regla de CSS: las dos declaraciones generan `font-family: Newsreader` con
 * `font-style` distinto, y la selección por estilo la hace el navegador.
 */
export const newsreaderItalic = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader-italic",
  style: ["italic"],
  preload: false,
});

/**
 * Grotesca de Omnibus-Type, Buenos Aires. La voz funcional del sitio es
 * tipografía argentina: no es decorativo, es de dónde viene el proyecto.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
});
