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
  style: ["normal", "italic"],
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
