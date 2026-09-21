/**
 * Las rutas del sitio, en un solo lugar.
 *
 * El orden es el del mockup aprobado (ADR-025): Historia, Cómo ayudar, Norma,
 * Lo que viene después, Contacto. Cómo ayudar no se lista en el encabezado:
 * ya está el CTA que apunta a `/ayudar` (ADR-045). `HEADER_NAV` es esa lista
 * sin esa ruta.
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
    summary: "Tres caminos: ir, donar plata, o traer lo que falta.",
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
    summary: "WhatsApp, correo e Instagram para coordinar.",
  },
] as const;

/** Encabezado y menú: las secciones del relato, sin repetir el CTA. */
export const HEADER_NAV = PRIMARY_NAV.filter((item) => item.href !== "/ayudar");

export const SECONDARY_NAV = [
  { href: "/novedades", label: "Novedades" },
  { href: "/reconstruccion", label: "La obra" },
  { href: "/catalogo", label: "Qué falta" },
  { href: "/quienes-ayudaron", label: "Quiénes ayudaron" },
] as const;

export const LEGAL_NAV = [
  { href: "/legales/privacidad", label: "Privacidad" },
  { href: "/legales/terminos", label: "Términos de uso" },
] as const;

/**
 * Destino único de la cuenta. Sin sesión, `proxy.ts` manda a ingresar; con
 * sesión, `/cuenta` es el escritorio propio. No vive en PRIMARY_NAV: no es una
 * sección del relato.
 */
export const ACCOUNT_HREF = "/cuenta" as const;

/** Rutas públicas indexables, para el sitemap. */
export const PUBLIC_ROUTES = [
  "/",
  ...PRIMARY_NAV.map((item) => item.href),
  ...SECONDARY_NAV.map((item) => item.href),
  "/ayudar/dinero",
  "/transparencia",
  ...LEGAL_NAV.map((item) => item.href),
] as const;
