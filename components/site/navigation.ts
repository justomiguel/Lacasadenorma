/**
 * Las rutas del sitio, en un solo lugar.
 *
 * El orden es el del mockup aprobado (ADR-025): Historia, Cómo ayudar, Norma,
 * Lo que viene después, Contacto. La acción de ayudar no vive acá: es el CTA
 * del encabezado y apunta a `/ayudar#donaciones`.
 *
 * Las URLs están en castellano porque el sitio es en castellano (ADR-014).
 */
export const PRIMARY_NAV = [
  {
    href: "/que-paso",
    label: "Historia",
    shortLabel: "Historia",
    summary: "El fuego se llevó nuestra casa.",
  },
  {
    href: "/ayudar",
    label: "Cómo ayudar",
    shortLabel: "Cómo ayudar",
    summary: "Tres formas de hacer la diferencia.",
  },
  {
    href: "/norma",
    label: "Norma",
    shortLabel: "Norma",
    summary: "Quién fue y qué dejó hecho.",
  },
  {
    href: "/legado",
    label: "Lo que viene después",
    shortLabel: "Lo que viene después",
    summary: "La intención futura, todavía sin organización.",
  },
  {
    href: "/contacto",
    label: "Contacto",
    shortLabel: "Contacto",
    summary: "WhatsApp de Saúl y el teléfono publicado.",
  },
] as const;

export const SECONDARY_NAV = [
  { href: "/novedades", label: "Novedades" },
  { href: "/reconstruccion", label: "La obra" },
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
  "/transparencia",
  ...LEGAL_NAV.map((item) => item.href),
] as const;
