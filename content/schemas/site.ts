import { z } from "zod";

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

export type SiteContent = z.infer<typeof siteSchema>;
