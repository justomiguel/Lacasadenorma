/**
 * Las rutas del sitio, en un solo lugar.
 *
 * El orden **es** el recorrido que propone la experiencia: pérdida → comunidad →
 * reconstrucción → legado (ADR-024). No es alfabético y no debería serlo.
 *
 * Las URLs están en castellano porque el sitio es en castellano (ADR-014).
 *
 * Cada ruta primaria lleva tres textos, y los tres se usan en lugares distintos:
 *
 * - `label`, el nombre completo, para el pie y el sumario.
 * - `shortLabel`, para el encabezado, donde las seis tienen que entrar en una
 *   línea. Es una abreviación del mismo nombre, nunca otro nombre: si el
 *   encabezado dice una cosa y el pie otra, son dos sitios.
 * - `summary`, qué hay en esa página. El sumario del documento lo muestra, porque
 *   una lista de seis títulos no dice a dónde conviene ir primero.
 */
export const PRIMARY_NAV = [
  {
    href: "/norma",
    label: "La historia de Norma",
    shortLabel: "Norma",
    summary: "Quién fue y qué dejó hecho.",
  },
  {
    href: "/que-paso",
    label: "Qué ocurrió",
    shortLabel: "Qué ocurrió",
    summary: "La noche del incendio y lo que quedó.",
  },
  {
    href: "/reconstruccion",
    label: "La reconstrucción",
    shortLabel: "La obra",
    summary: "Qué hay que hacer, cuánto sale y cómo va.",
  },
  {
    href: "/ayudar",
    label: "Cómo ayudar",
    shortLabel: "Ayudar",
    summary: "Los datos para transferir desde Argentina, Chile o Estados Unidos.",
  },
  {
    href: "/transparencia",
    label: "Transparencia",
    shortLabel: "Transparencia",
    summary: "En qué se usó cada peso, con fecha y comprobante.",
  },
  {
    href: "/novedades",
    label: "Novedades",
    shortLabel: "Novedades",
    summary: "Lo que va pasando en la obra, fechado.",
  },
] as const;

export const SECONDARY_NAV = [{ href: "/legado", label: "El legado" }] as const;

export const LEGAL_NAV = [
  { href: "/legales/privacidad", label: "Privacidad" },
  { href: "/legales/terminos", label: "Términos de uso" },
] as const;

/** Rutas públicas indexables, para el sitemap. */
export const PUBLIC_ROUTES = [
  "/",
  ...PRIMARY_NAV.map((item) => item.href),
  ...SECONDARY_NAV.map((item) => item.href),
  ...LEGAL_NAV.map((item) => item.href),
] as const;
