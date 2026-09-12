/**
 * Las rutas públicas del sitio, en una sola lista.
 *
 * Está acá y no repetida en cada archivo porque las suites de accesibilidad y de
 * metadatos tienen que recorrerlas **todas**: una página nueva que se olvide de sumar
 * a la lista queda sin revisar, y el síntoma sería una página con problemas de
 * contraste o sin `canonical` que nadie detecta hasta que alguien la usa.
 *
 * `/novedades/empezo-el-techo` no está: existe sólo cuando hay base de datos con el
 * fixture, así que vive en la suite que corre con datos.
 */
export const PAGINAS_PUBLICAS = [
  { path: "/", nombre: "Home" },
  { path: "/norma", nombre: "La historia de Norma" },
  { path: "/que-paso", nombre: "Qué ocurrió" },
  { path: "/reconstruccion", nombre: "La reconstrucción" },
  { path: "/ayudar", nombre: "Cómo ayudar" },
  { path: "/contacto", nombre: "Contacto" },
  { path: "/transparencia", nombre: "Transparencia" },
  { path: "/novedades", nombre: "Novedades" },
  { path: "/legado", nombre: "El legado" },
  { path: "/legales/privacidad", nombre: "Privacidad" },
  { path: "/legales/terminos", nombre: "Términos" },
] as const;

/**
 * El ancho de quien llega desde un WhatsApp reenviado en un teléfono viejo.
 *
 * 360 px no es una elección estética: es el ancho que SC-001 usa para exigir que el
 * nombre y la acción principal se vean sin desplazarse, y el que `ux.md` fija como
 * piso del sistema de diseño.
 */
export const VIEWPORT_MINIMO = { width: 360, height: 640 } as const;
