import { z } from "zod";

import { isoDate, paragraphs, photoSchema } from "./primitives";

const personChapterSchema = z.object({
  kicker: z.string().min(1).nullable(),
  title: z.string().min(1),
  paragraphs,
  /** Fotos de este tramo. Vacío cuando el capítulo es sólo prosa. */
  photos: z.array(photoSchema),
});

const personBookSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1).nullable(),
  author: z.string().min(1),
  year: z.string().min(4),
  /** Ruta pública del PDF. El mismo archivo para leer y para descargar. */
  href: z.string().startsWith("/documentos/"),
  lead: z.string().min(1),
  cover: photoSchema,
});

export const personSchema = z.object({
  slug: z.string().min(1),
  fullName: z.string().min(1),
  /** Cómo la conocían en el pueblo, si es distinto del nombre completo. */
  knownAs: z.string().min(1).nullable(),
  roleLabel: z.string().min(1),
  summary: z.string().min(1),
  /** Título de apertura de `/norma` y del capítulo en la home. */
  openingTitle: z.string().min(1),
  paragraphs,
  /**
   * Capítulos del relato publicado. El documento familiar es la fuente; no se
   * inventan cargos, fechas ni testimonios.
   */
  chapters: z.array(personChapterSchema).min(1),
  /**
   * Testimonios transcritos del documento. Vacío omite la sección. Como máximo
   * tres, y cada cita va entre comillas tal como está en la fuente.
   */
  quotes: z
    .array(
      z.object({
        quote: z.string().min(1),
        author: z.string().min(1),
        relation: z.string().min(1),
      }),
    )
    .max(3),
  bridge: z.object({
    title: z.string().min(1),
    paragraphs,
  }),
  /** La obra conmemorativa, cuando el PDF está en `public/documentos/`. */
  book: personBookSchema,
  /** Nulos mientras la familia no publique las fechas. No se estiman. */
  bornOn: isoDate.nullable(),
  diedOn: isoDate.nullable(),
  /** El retrato que abre el sitio. Nulo mientras la familia no elija. */
  portrait: photoSchema.nullable(),
  /** Las demás fotos de ella, para su página. */
  photos: z.array(photoSchema),
});

export type PersonContent = z.infer<typeof personSchema>;
