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
 * Las cifras, las fechas, los montos y las fotografías **no viven acá**: son
 * datos operativos que cambian seguido y viven en la base (ADR-007).
 */

/** Prosa: párrafos sueltos, sin HTML. Cada elemento es un `<p>`. */
const paragraphs = z.array(z.string().trim().min(1)).min(1);

/** Prosa que puede no existir todavía. Vacía significa "se omite la sección". */
const optionalParagraphs = z.array(z.string().trim().min(1));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD");

export const siteSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  /** Se usa como `description` en metadata: conviene que no pase de 160 caracteres. */
  shortDescription: z.string().min(40).max(160),
  longDescription: z.string().min(40),
  place: z.object({
    locality: z.string().min(1),
    province: z.string().min(1),
    country: z.string().min(1),
  }),
  /** Estado del proyecto en una línea, para el pie y los datos estructurados. */
  status: z.string().min(1),
});

export const personSchema = z.object({
  slug: z.string().min(1),
  fullName: z.string().min(1),
  roleLabel: z.string().min(1),
  summary: z.string().min(1),
  paragraphs,
  /** Nulos mientras la familia no publique las fechas. No se estiman. */
  bornOn: isoDate.nullable(),
  diedOn: isoDate.nullable(),
});

export const pageSchema = z.object({
  title: z.string().min(1),
  /** Bajada de entrada. Una sola oración. */
  lead: z.string().min(1),
  paragraphs: optionalParagraphs,
});

export const whatHappenedSchema = pageSchema.extend({
  /**
   * El cierre de la página. Existe para que el relato no termine en la pérdida,
   * sino en qué se necesita ahora (ux.md, `/que-paso`).
   */
  needNow: z.object({
    title: z.string().min(1),
    paragraphs,
  }),
});

export const reconstructionSchema = pageSchema.extend({
  /**
   * Qué hay que hacer, en lenguaje llano y **sin montos**. Los montos son datos
   * operativos: viven en `budget_items` y se publican cuando estén cotizados.
   */
  scope: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
});

export const helpSchema = pageSchema.extend({
  /** Qué hacer después de transferir. Es la parte que la gente pregunta. */
  afterTransfer: paragraphs,
});

export const transparencySchema = pageSchema.extend({
  /** Cómo se lleva la cuenta. Explicar el método es parte de la rendición. */
  method: paragraphs,
});

export const programSchema = pageSchema.extend({
  /**
   * Temas de formación de Riacho Conecta. Son intenciones declaradas, no un
   * programa con fechas: el contenido no promete lo que no está decidido.
   */
  topics: z.array(z.string().min(1)).min(1),
});

export const faqSchema = z
  .array(
    z.object({
      question: z.string().min(1),
      answer: paragraphs,
      /** Ruta con la respuesta completa, si existe una página propia. */
      href: z.string().startsWith("/").nullable(),
    }),
  )
  .min(9, "Las nueve preguntas del proyecto son un requisito (FR-001)");

const sectionSchema = z.object({
  heading: z.string().min(1),
  paragraphs,
});

export const legalSchema = z.object({
  updatedOn: isoDate,
  privacy: pageSchema.extend({ sections: z.array(sectionSchema).min(1) }),
  terms: pageSchema.extend({ sections: z.array(sectionSchema).min(1) }),
});

export type SiteContent = z.infer<typeof siteSchema>;
export type PersonContent = z.infer<typeof personSchema>;
export type PageContent = z.infer<typeof pageSchema>;
export type WhatHappenedContent = z.infer<typeof whatHappenedSchema>;
export type ReconstructionContent = z.infer<typeof reconstructionSchema>;
export type HelpContent = z.infer<typeof helpSchema>;
export type TransparencyContent = z.infer<typeof transparencySchema>;
export type ProgramContent = z.infer<typeof programSchema>;
export type FaqContent = z.infer<typeof faqSchema>;
export type LegalContent = z.infer<typeof legalSchema>;
export type SectionContent = z.infer<typeof sectionSchema>;

/**
 * Valida un documento de contenido y **falla fuerte** si no cumple. Se llama al
 * importar, no al renderizar: un contenido inválido tiene que romper el build
 * (principio XII), no aparecer roto en producción.
 */
export function parseContent<T extends z.ZodType>(
  schema: T,
  data: unknown,
  fileName: string,
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  · ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`El contenido de content/${fileName} no cumple su esquema:\n${detail}`);
  }

  return result.data;
}
