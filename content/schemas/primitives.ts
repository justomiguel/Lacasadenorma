import { z } from "zod";

/**
 * Esquemas del contenido versionado (ADR-007).
 *
 * Dos reglas gobiernan estos esquemas:
 *
 * 1. **La validación corre al importar el módulo**, así que un campo faltante o
 *    mal escrito rompe el build, no la página en producción.
 * 2. **Un campo que todavía no tiene dato verificado es `null`, no una cadena de
 *    relleno.** La interfaz omite la sección; nunca muestra un texto de ejemplo.
 *    Lo que falta está listado en `docs/content-guide.md`.
 *
 * Las cifras, las fechas y los montos **no viven acá**: son datos operativos que
 * cambian seguido y viven en la base (ADR-007).
 *
 * Las fotografías se dividen por la misma regla, la frecuencia de cambio
 * ([ADR-021](../../docs/adr/021-segunda-direccion-visual.md)): las **editoriales**
 * —el retrato de Norma, el incendio, la limpieza— se eligen una vez y viven acá,
 * con el archivo en `public/fotos/`. Las del **avance de la obra** cambian con
 * cada novedad y siguen viniendo de la base, subidas desde el backoffice.
 */

/** Prosa: párrafos sueltos, sin HTML. Cada elemento es un `<p>`. */
export const paragraphs = z.array(z.string().trim().min(1)).min(1);

/** Prosa que puede no existir todavía. Vacía significa "se omite la sección". */
export const optionalParagraphs = z.array(z.string().trim().min(1));

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD");

export const phrase = z.string().min(1);

/**
 * Una fotografía editorial. El archivo vive en `public/fotos/`.
 *
 * `width` y `height` son los del archivo real y son obligatorios: sin dimensiones
 * no hay reserva de espacio y hay CLS, y los Core Web Vitals son requisito
 * funcional (principio VII). Si alguien reemplaza la foto por una de otro tamaño y
 * se olvida de actualizar estos números, la imagen sale deformada, así que
 * `npm run check:fotos` los compara contra el archivo.
 *
 * `alt` describe lo que se ve para alguien que no puede verlo, y no repite el
 * epígrafe. Es obligatorio: una foto sin `alt` no se publica.
 */
export const photoSchema = z.object({
  url: z.string().startsWith("/fotos/", "La foto tiene que vivir en public/fotos/"),
  alt: z.string().min(1),
  /** Lo que la foto necesita que se diga, si necesita algo. */
  caption: z.string().min(1).nullable(),
  /** Quién la sacó, cuando se sabe. No se inventa una atribución. */
  credit: z.string().min(1).nullable(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /**
   * Cuándo se sacó. Nulo cuando no se sabe con certeza: una fecha estimada en una
   * foto documental es una afirmación falsa sobre el mundo.
   */
  takenOn: isoDate.nullable(),
});

/**
 * Un tramo del ensayo fotográfico: un título y las fotos de ese momento.
 *
 * La agrupación **es** el relato. Las fotos del incendio y las de la limpieza no
 * se mezclan en una galería: van en tramos con su título, porque la diferencia
 * entre lo que se perdió y lo que se está haciendo es el argumento entero de la
 * campaña (`ux.md` §1).
 */
export const photoGroupSchema = z.object({
  heading: z.string().min(1),
  /** Una línea que sitúa el tramo. Nula cuando el título alcanza. */
  note: z.string().min(1).nullable(),
  photos: z.array(photoSchema).min(1),
});

export type Photo = z.infer<typeof photoSchema>;
export type PhotoGroup = z.infer<typeof photoGroupSchema>;
