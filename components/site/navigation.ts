/**
 * Las rutas del sitio, en un solo lugar.
 *
 * El orden **es** el recorrido que propone la experiencia: memoria → ayuda →
 * reconstrucción → futuro. No es alfabético y no debería serlo.
 *
 * Las URLs están en castellano porque el sitio es en castellano (ADR-014).
 */
export const PRIMARY_NAV = [
  { href: "/norma", label: "La historia de Norma" },
  { href: "/que-paso", label: "Qué ocurrió" },
  { href: "/reconstruccion", label: "La reconstrucción" },
  { href: "/ayudar", label: "Cómo ayudar" },
  { href: "/transparencia", label: "Transparencia" },
  { href: "/novedades", label: "Novedades" },
] as const;

export const SECONDARY_NAV = [
  { href: "/legado", label: "El legado" },
  { href: "/riacho-conecta", label: "Riacho Conecta" },
] as const;

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
