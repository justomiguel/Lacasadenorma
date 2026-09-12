import { Caveat, Inter, Playfair_Display } from "next/font/google";

/**
 * Tres voces, las del mockup aprobado (ADR-025).
 *
 * Se autoalojan con `next/font`: sin pedidos a terceros, sin FOUT y sin un
 * origen más en la CSP. Playfair e Inter se dibujan en el primer pliegue, así
 * que se precargan. La itálica de Playfair y Caveat no: aparecen más abajo.
 */

/** Display / editorial. H1, H2, frases grandes. */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  style: ["normal"],
});

export const playfairItalic = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair-italic",
  style: ["italic"],
  preload: false,
});

/** UI y prosa. Navegación, botones, cuerpo, datos bancarios. */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Notas manuscritas. Sólo frases emocionales, nunca UI. */
export const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-caveat",
  preload: false,
});
