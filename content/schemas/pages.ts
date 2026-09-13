import { z } from "zod";

import { isoDate, optionalParagraphs, paragraphs, photoGroupSchema } from "./primitives";

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
  /**
   * La frase de la familia, atribuida. Es el único momento del sitio que sube a
   * escala de display, y es deliberado: es la que ordena todo el proyecto y la
   * única persona con derecho a decirla es quien la dijo.
   *
   * Nula si la familia no autorizó ninguna. **No se escribe una en su lugar**:
   * cualquier frase que redacte el sitio es la lástima que `ux.md` §1 prohíbe.
   */
  testimony: z
    .object({
      quote: z.string().min(1),
      author: z.string().min(1),
      /** "Hijo", "Hermana". Cómo firma. */
      relation: z.string().min(1),
    })
    .nullable(),
  /**
   * El ensayo fotográfico del incendio, en tramos. Vacío hasta que haya material:
   * la página se lee igual sin él.
   */
  photoEssay: z.array(photoGroupSchema),
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
  /**
   * El trabajo hecho hasta ahora, en tramos. Es lo que muestra que la obra está
   * en marcha y no es una promesa. Las fotos del avance propiamente dicho llegan
   * fechadas con cada novedad, desde la base.
   */
  photoEssay: z.array(photoGroupSchema),
});

export const helpSchema = pageSchema.extend({
  /** Qué hacer después de transferir. Es la parte que la gente pregunta. */
  afterTransfer: paragraphs,
  /** Materiales útiles, sin cantidades ni precios. */
  materials: z.array(z.string().min(1)).min(1),
  contact: z.object({
    name: z.string().min(1),
    phoneDisplay: z.string().min(1),
    /** E.164, para `tel:` y `wa.me`. */
    phoneTel: z.string().regex(/^\+[1-9]\d{6,14}$/),
  }),
  accounts: z.object({
    AR: z.object({
      holder: z.string().min(1),
      taxId: z.string().min(1),
      alias: z.string().min(1),
      cbu: z.string().min(1),
      accountNumber: z.string().min(1),
    }),
    CL: z.object({
      holder: z.string().min(1),
      rut: z.string().min(1),
      bank: z.string().min(1),
      accountType: z.string().min(1),
      accountNumber: z.string().min(1),
      email: z.string().min(1),
    }),
  }),
  /**
   * URLs reales o `null`. Nulo significa: el canal se muestra, el botón no.
   * No se inventa un href.
   */
  mercadoPagoUrl: z.string().url().nullable(),
  paypalUrl: z.string().url().nullable(),
});

export const transparencySchema = pageSchema.extend({
  /** Cómo se lleva la cuenta. Explicar el método es parte de la rendición. */
  method: paragraphs,
});

export const faqSchema = z
  .array(
    z
      .object({
        question: z.string().min(1),
        answer: paragraphs,
        /** Ruta con la respuesta completa, si existe una página propia. */
        href: z.string().startsWith("/").nullable(),
        /**
         * Texto del enlace, escrito para esta pregunta. Nunca "ver más": varios
         * enlaces con el mismo texto son, para un lector de pantalla, enlaces
         * entre los que no se puede elegir.
         */
        linkLabel: z.string().min(1).nullable(),
      })
      .refine((entry) => (entry.href === null) === (entry.linkLabel === null), {
        message:
          "`href` y `linkLabel` van juntos: un enlace sin texto no se puede anunciar, y un texto sin destino no lleva a ninguna parte",
        path: ["linkLabel"],
      }),
  )
  .min(1)
  .max(3, "Como máximo tres preguntas: el relato ya responde el resto");

const sectionSchema = z.object({
  heading: z.string().min(1),
  paragraphs,
});

export const legalSchema = z.object({
  updatedOn: isoDate,
  privacy: pageSchema.extend({ sections: z.array(sectionSchema).min(1) }),
  terms: pageSchema.extend({ sections: z.array(sectionSchema).min(1) }),
});

export type PageContent = z.infer<typeof pageSchema>;
export type WhatHappenedContent = z.infer<typeof whatHappenedSchema>;
export type ReconstructionContent = z.infer<typeof reconstructionSchema>;
export type HelpContent = z.infer<typeof helpSchema>;
export type TransparencyContent = z.infer<typeof transparencySchema>;
export type FaqContent = z.infer<typeof faqSchema>;
export type LegalContent = z.infer<typeof legalSchema>;
export type SectionContent = z.infer<typeof sectionSchema>;
