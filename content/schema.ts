import type { z } from "zod";

import { uiChromeSchema } from "./schemas/ui-chrome";
import { uiPagesSchema } from "./schemas/ui";

export {
  faqSchema,
  helpSchema,
  legalSchema,
  pageSchema,
  reconstructionSchema,
  transparencySchema,
  whatHappenedSchema,
} from "./schemas/pages";
export type {
  FaqContent,
  HelpContent,
  LegalContent,
  PageContent,
  ReconstructionContent,
  SectionContent,
  TransparencyContent,
  WhatHappenedContent,
} from "./schemas/pages";
export { personSchema } from "./schemas/person";
export type { PersonContent } from "./schemas/person";
export { photoGroupSchema, photoSchema } from "./schemas/primitives";
export type { Photo, PhotoGroup } from "./schemas/primitives";
export { siteSchema } from "./schemas/site";
export type { SiteContent } from "./schemas/site";

export const uiSchema = uiChromeSchema.extend(uiPagesSchema.shape);

export type UiContent = z.infer<typeof uiSchema>;

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
