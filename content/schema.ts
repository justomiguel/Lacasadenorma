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
 * ([ADR-021](../docs/adr/021-segunda-direccion-visual.md)): las **editoriales**
 * —el retrato de Norma, el incendio, la limpieza— se eligen una vez y viven acá,
 * con el archivo en `public/fotos/`. Las del **avance de la obra** cambian con
 * cada novedad y siguen viniendo de la base, subidas desde el backoffice.
 */

/** Prosa: párrafos sueltos, sin HTML. Cada elemento es un `<p>`. */
const paragraphs = z.array(z.string().trim().min(1)).min(1);

/** Prosa que puede no existir todavía. Vacía significa "se omite la sección". */
const optionalParagraphs = z.array(z.string().trim().min(1));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD");

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
const photoGroupSchema = z.object({
  heading: z.string().min(1),
  /** Una línea que sitúa el tramo. Nula cuando el título alcanza. */
  note: z.string().min(1).nullable(),
  photos: z.array(photoSchema).min(1),
});

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
  /** Cómo la conocían en el pueblo, si es distinto del nombre completo. */
  knownAs: z.string().min(1).nullable(),
  roleLabel: z.string().min(1),
  summary: z.string().min(1),
  paragraphs,
  /** Nulos mientras la familia no publique las fechas. No se estiman. */
  bornOn: isoDate.nullable(),
  diedOn: isoDate.nullable(),
  /** El retrato que abre el sitio. Nulo mientras la familia no elija. */
  portrait: photoSchema.nullable(),
  /** Las demás fotos de ella, para su página. */
  photos: z.array(photoSchema),
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
    z
      .object({
        question: z.string().min(1),
        answer: paragraphs,
        /** Ruta con la respuesta completa, si existe una página propia. */
        href: z.string().startsWith("/").nullable(),
        /**
         * Texto del enlace, escrito para esta pregunta. Nunca "ver más": nueve
         * enlaces con el mismo texto son, para un lector de pantalla, nueve
         * enlaces entre los que no se puede elegir.
         */
        linkLabel: z.string().min(1).nullable(),
      })
      .refine((entry) => (entry.href === null) === (entry.linkLabel === null), {
        message:
          "`href` y `linkLabel` van juntos: un enlace sin texto no se puede anunciar, y un texto sin destino no lleva a ninguna parte",
        path: ["linkLabel"],
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

const navItemSchema = z.object({
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  summary: z.string().min(1),
});

const namedLinkSchema = z.object({
  label: z.string().min(1),
});

/**
 * Chrome de la interfaz: no es editorial, y por eso no vive en los JSON de
 * cada página. El encabezado, el pie, el sumario y los botones de copiar y
 * compartir lo leen de acá. Un componente de cliente **no** importa este
 * archivo: lo recibe por props o por el `UiProvider` del layout (ADR-023).
 */
const phrase = z.string().min(1);

export const uiSchema = z.object({
  skipToContent: phrase,
  helpCta: phrase,
  helpShort: phrase,
  copy: phrase,
  copied: phrase,
  copiedAnnouncement: phrase,
  copyFailed: phrase,
  share: phrase,
  copyLink: phrase,
  linkCopied: phrase,
  linkCopiedLive: phrase,
  languageName: phrase,
  otherLanguageName: phrase,
  countryTabsLabel: phrase,
  homeLabel: phrase,
  legalLabel: phrase,
  publishedOn: phrase,
  lastUpdated: phrase,
  footerNote: phrase,
  ogCardFooter: phrase,
  nav: z.object({
    primary: phrase,
    index: phrase,
    footer: phrase,
    project: phrase,
    campaign: phrase,
    next: phrase,
    legal: phrase,
  }),
  primaryNav: z.object({
    "/norma": navItemSchema,
    "/que-paso": navItemSchema,
    "/reconstruccion": navItemSchema,
    "/ayudar": navItemSchema,
    "/transparencia": navItemSchema,
    "/novedades": navItemSchema,
  }),
  secondaryNav: z.object({
    "/legado": namedLinkSchema,
    "/riacho-conecta": namedLinkSchema,
  }),
  legalNav: z.object({
    "/legales/privacidad": namedLinkSchema,
    "/legales/terminos": namedLinkSchema,
  }),
  countries: z.object({
    AR: phrase,
    CL: phrase,
    US: phrase,
  }),
  expenseCategories: z.object({
    materiales: phrase,
    mano_de_obra: phrase,
    servicios: phrase,
    transporte: phrase,
    herramientas: phrase,
    otros: phrase,
  }),
  figures: z.object({
    received: phrase,
    receivedIn: phrase,
    spent: phrase,
    balance: phrase,
    executedNote: phrase,
    otherCurrency: phrase,
    unquoted: phrase,
    noGoal: phrase,
    raisedOfGoal: phrase,
    ofGoal: phrase,
    percentOfGoal: phrase,
  }),
  progress: z.object({
    noReconciliation: phrase,
    reconciledOn: phrase,
    otherCurrencies: phrase,
    milestones: phrase,
    staleTitle: phrase,
    staleBody: phrase,
  }),
  budget: z.object({
    emptyTitle: phrase,
    emptyBody: phrase,
    noneQuoted: phrase,
    someQuoted: phrase,
  }),
  ledger: z.object({
    date: phrase,
    concept: phrase,
    category: phrase,
    receipt: phrase,
    amount: phrase,
    yes: phrase,
    receiptYes: phrase,
    receiptMissing: phrase,
    caption: phrase,
  }),
  donations: z.object({
    emptyTitle: phrase,
    emptyBody: phrase,
  }),
  unavailable: z.object({
    errorTitle: phrase,
    emptyTitle: phrase,
    notConfigured: phrase,
    error: phrase,
    notPublished: phrase,
  }),
  news: z.object({
    title: phrase,
    lead: phrase,
    seoDescription: phrase,
    fallbackTitle: phrase,
    intro: phrase,
    introLinks: phrase,
    whoWas: phrase,
    whatToRebuild: phrase,
    howToHelp: phrase,
    unavailableTitle: phrase,
    emptyTitle: phrase,
    emptyBody: phrase,
    shareHeading: phrase,
    seeAll: phrase,
    seeTransparency: phrase,
    originalLanguage: phrase,
    introAnd: phrase,
  }),
  home: z.object({
    whoWasHeading: phrase,
    readFullStory: phrase,
    radioPhotoReserved: phrase,
    seePhotosAndNeeds: phrase,
    rebuildHeading: phrase,
    rebuildDetail: phrase,
    howItsGoing: phrase,
    howToHelp: phrase,
    seeFullDetails: phrase,
    seeWhereItWent: phrase,
    whereItWent: phrase,
    transparencyBlurb: phrase,
    seeFullReport: phrase,
    knowFoundation: phrase,
    seeRiacho: phrase,
    faqHeading: phrase,
    shareHeading: phrase,
    shareLead: phrase,
    knowNormaStory: phrase,
    portraitReserved: phrase,
  }),
  normaPage: z.object({
    title: phrase,
    seoDescription: phrase,
    contribution: phrase,
    privacyLink: phrase,
    radioReserved: phrase,
    photosNote: phrase,
    shareHeading: phrase,
  }),
  whatHappenedPage: z.object({
    seoDescription: phrase,
    whereLabel: phrase,
    whenLabel: phrase,
    whenValue: phrase,
    lostLabel: phrase,
    lostValue: phrase,
    photosHeading: phrase,
    seeBefore: phrase,
    rebuildLink: phrase,
    and: phrase,
    transparencyLink: phrase,
    end: phrase,
  }),
  reconstructionPage: z.object({
    seoDescription: phrase,
    workHeading: phrase,
    scopeHeading: phrase,
    budgetHeading: phrase,
    progressHeading: phrase,
    noMilestonesTitle: phrase,
    noMilestonesBody: phrase,
    photosNote: phrase,
    seeNews: phrase,
    helpHeading: phrase,
    helpLead: phrase,
  }),
  helpPage: z.object({
    seoDescription: phrase,
    beforeTransferTitle: phrase,
    beforeTransfer: phrase,
    accountsHeading: phrase,
    afterHeading: phrase,
    afterLinkLead: phrase,
    reportLink: phrase,
    afterLinkTail: phrase,
    shareHeading: phrase,
    shareLead: phrase,
  }),
  transparencyPage: z.object({
    seoDescription: phrase,
    totalsHeading: phrase,
    noReconciliation: phrase,
    reconciledOn: phrase,
    currenciesNote: phrase,
    staleTitle: phrase,
    staleBody: phrase,
    byCategoryHeading: phrase,
    ledgerHeading: phrase,
    noExpensesTitle: phrase,
    noExpensesBody: phrase,
    noReceipts: phrase,
    receiptsNote: phrase,
    methodHeading: phrase,
    helpHeading: phrase,
    helpLead: phrase,
    newsLink: phrase,
    helpLeadTail: phrase,
  }),
  legacyPage: z.object({
    seoDescription: phrase,
    statusTitle: phrase,
    statusBody: phrase,
    accountsLink: phrase,
    statusTail: phrase,
    radioReserved: phrase,
    seeTopics: phrase,
    houseFirst: phrase,
    houseFirstLead: phrase,
  }),
  riachoPage: z.object({
    seoDescription: phrase,
    topicsHeading: phrase,
    noSignupTitle: phrase,
    noSignup: phrase,
    newsLink: phrase,
    noSignupTail: phrase,
    whereHeading: phrase,
    whereLead: phrase,
    legacyLink: phrase,
  }),
  legalPage: z.object({
    privacySeo: phrase,
    termsSeo: phrase,
  }),
});

export type Photo = z.infer<typeof photoSchema>;
export type PhotoGroup = z.infer<typeof photoGroupSchema>;
export type SiteContent = z.infer<typeof siteSchema>;
export type UiContent = z.infer<typeof uiSchema>;
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

    throw new Error(
      `El contenido de content/${fileName} no cumple su esquema:\n${detail}`,
    );
  }

  return result.data;
}
