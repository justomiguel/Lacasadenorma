/**
 * Variantes del símbolo de La Casa de Norma, recortadas de la lámina.
 *
 * El círculo, no el lockup: el nombre se escribe al lado en Playfair (ADR-035).
 * Cuál se usa en cada superficie lo decide `use`. El encabezado, el favicon y
 * las tarjetas de compartir usan **original**. El resto está para no volver a
 * recortar la lámina el día que haga falta un avatar, un fondo oscuro o un
 * monocromo de imprenta.
 *
 * `scripts/check-marca.mjs` comprueba que cada id tenga archivo y las medidas
 * declaradas. No exige que todas se pinten: estar disponibles es el punto.
 */

export const MARK_VARIANTS = {
  original: {
    src: "/marca/simbolo.png",
    sheet: "01 ORIGINAL",
    use: "Encabezado, menú, pie, favicon y tarjetas de compartir. Verde principal sobre papel, foto o bosque.",
    width: 198,
    height: 198,
  },
  tierra: {
    src: "/marca/tierra.png",
    sheet: "02 TIERRA",
    use: "Soportes cálidos o impresos sobre papel de color arena. No reemplaza a original en el sitio.",
    width: 170,
    height: 170,
  },
  monocromo: {
    src: "/marca/monocromo.png",
    sheet: "03 MONOCROMO",
    use: "Impresión a una tinta, sello, fax. Blanco sobre negro.",
    width: 164,
    height: 164,
  },
  salvia: {
    src: "/marca/salvia.png",
    sheet: "04 SALVIA",
    use: "Acento sereno sobre sage. No es el verde del sistema; no va en el chrome.",
    width: 164,
    height: 164,
  },
  terracota: {
    src: "/marca/terracota.png",
    sheet: "05 TERRACOTA",
    use: "La lámina la trae. El sitio abandonó la terracota (ADR-024): no se usa en producto.",
    width: 164,
    height: 164,
  },
  linea: {
    src: "/marca/linea.png",
    sheet: "06 LINEA",
    use: "Trazo simple, fondos muy chicos o bordado. No es el favicon: el favicon es original a 32 px.",
    width: 182,
    height: 182,
  },
  oscuro: {
    src: "/marca/oscuro.png",
    sheet: "07 OSCURO",
    use: "Superficie bosque o carbón cuando original no separe. El menú hoy usa original, que ya trae campo crema.",
    width: 174,
    height: 174,
  },
  "oscuro-negro": {
    src: "/marca/oscuro-negro.png",
    sheet: "08 OSCURO SOBRE NEGRO",
    use: "Fondo negro. Perfil o recuadro sobre foto muy oscura.",
    width: 158,
    height: 158,
  },
  azul: {
    src: "/marca/azul.png",
    sheet: "09 AZUL",
    use: "Soporte institucional ajeno al sitio. El producto no tiene azul de marca.",
    width: 158,
    height: 158,
  },
  bordo: {
    src: "/marca/bordo.png",
    sheet: "10 BORDO",
    use: "Soporte puntual de la lámina. No entra a la paleta del sitio.",
    width: 162,
    height: 162,
  },
  gris: {
    src: "/marca/gris.png",
    sheet: "11 GRIS",
    use: "Escala de grises, documento interno, marca de agua.",
    width: 162,
    height: 162,
  },
  claro: {
    src: "/marca/claro.png",
    sheet: "12 CLARO",
    use: "Fondo blanco puro, donde el círculo verde de original contrastaría de más.",
    width: 174,
    height: 174,
  },
  "perfil-original": {
    src: "/marca/perfil-original.png",
    sheet: "VARIANTE REDONDA · original",
    use: "Avatar de app, WhatsApp o Instagram. Recorte circular sin wordmark.",
    width: 88,
    height: 88,
  },
  "perfil-tierra": {
    src: "/marca/perfil-tierra.png",
    sheet: "VARIANTE REDONDA · tierra",
    use: "Avatar sobre fondo cálido. Misma regla que tierra.",
    width: 88,
    height: 88,
  },
  "perfil-monocromo": {
    src: "/marca/perfil-monocromo.png",
    sheet: "VARIANTE REDONDA · monocromo",
    use: "Avatar a una tinta.",
    width: 88,
    height: 88,
  },
} as const;

export type MarkVariantId = keyof typeof MARK_VARIANTS;

/** El símbolo que el sitio pinta: 01 ORIGINAL. */
export const DEFAULT_MARK = MARK_VARIANTS.original;
