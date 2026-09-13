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
 *
 * `/ayudar/paypal/*` sí está: se llega desde PayPal, no desde el menú, pero axe y
 * la revisión visual tienen que cubrirlas igual. No van al sitemap.
 */
export const PAGINAS_PUBLICAS = [
  { path: "/", nombre: "Home" },
  { path: "/norma", nombre: "La historia de Norma" },
  { path: "/que-paso", nombre: "Qué ocurrió" },
  { path: "/reconstruccion", nombre: "La reconstrucción" },
  { path: "/catalogo", nombre: "Qué le falta a la casa" },
  { path: "/ayudar", nombre: "Cómo ayudar" },
  { path: "/ayudar/paypal/completada", nombre: "PayPal completada" },
  { path: "/ayudar/paypal/cancelada", nombre: "PayPal cancelada" },
  { path: "/contacto", nombre: "Contacto" },
  { path: "/transparencia", nombre: "Transparencia" },
  { path: "/novedades", nombre: "Novedades" },
  { path: "/legado", nombre: "El legado" },
  { path: "/legales/privacidad", nombre: "Privacidad" },
  { path: "/legales/terminos", nombre: "Términos" },
] as const;

/**
 * Las pantallas de identidad, aparte de las públicas y no sumadas a la lista de
 * arriba.
 *
 * No están ahí porque `PAGINAS_PUBLICAS` es también la lista de lo que el sitio
 * **publica**: la recorren la revisión visual, la de metadatos de compartir y la de
 * degradación, y las cuatro de cuenta llevan `noIndex`, no van al sitemap y no
 * tienen tarjeta de compartir. Agregarlas ahí habría hecho fallar tres suites por
 * la ausencia de algo que a propósito no tienen.
 *
 * Lo que sí comparten es el marco del sitio público —`PublicDocument`, el salto al
 * contenido, la tipografía—, y por eso la accesibilidad las recorre igual.
 *
 * Las cuatro se ven sin sesión y sin base de datos: tres son estáticas y
 * `/cuenta/clave` muestra su estado «este enlace no sirve», que es un estado
 * diseñado y hay que revisarlo como cualquier otro. `/cuenta` no está: sin sesión
 * redirige, y lo que habría que medir es la pantalla a la que lleva.
 */
export const PAGINAS_DE_CUENTA = [
  { path: "/cuenta/crear", nombre: "Crear una cuenta" },
  { path: "/cuenta/ingresar", nombre: "Ingresar" },
  { path: "/cuenta/recuperar", nombre: "Recuperar el acceso" },
  { path: "/cuenta/clave", nombre: "Poner una contraseña nueva" },
] as const;

/** Todo lo que se sirve con el marco público, que es lo que axe tiene que recorrer. */
export const PAGINAS_CON_MARCO_PUBLICO = [
  ...PAGINAS_PUBLICAS,
  ...PAGINAS_DE_CUENTA,
] as const;

/**
 * El ancho de quien llega desde un WhatsApp reenviado en un teléfono viejo.
 *
 * 360 px no es una elección estética: es el ancho que SC-001 usa para exigir que el
 * nombre y la acción principal se vean sin desplazarse, y el que `ux.md` fija como
 * piso del sistema de diseño.
 */
export const VIEWPORT_MINIMO = { width: 360, height: 640 } as const;
