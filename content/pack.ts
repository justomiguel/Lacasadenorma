import type { Locale } from "@/src/i18n/locale";

import ayudarEn from "./en/ayudar.json";
import legadoEn from "./en/legado.json";
import legalesEn from "./en/legales.json";
import normaEn from "./en/norma.json";
import preguntasEn from "./en/preguntas.json";
import quePasoEn from "./en/que-paso.json";
import reconstruccionEn from "./en/reconstruccion.json";
import riachoConectaEn from "./en/riacho-conecta.json";
import siteEn from "./en/site.json";
import transparenciaEn from "./en/transparencia.json";
import uiEn from "./en/ui.json";
import ayudarEs from "./es/ayudar.json";
import legadoEs from "./es/legado.json";
import legalesEs from "./es/legales.json";
import normaEs from "./es/norma.json";
import preguntasEs from "./es/preguntas.json";
import quePasoEs from "./es/que-paso.json";
import reconstruccionEs from "./es/reconstruccion.json";
import riachoConectaEs from "./es/riacho-conecta.json";
import siteEs from "./es/site.json";
import transparenciaEs from "./es/transparencia.json";
import uiEs from "./es/ui.json";
import {
  faqSchema,
  helpSchema,
  legalSchema,
  pageSchema,
  parseContent,
  personSchema,
  programSchema,
  reconstructionSchema,
  siteSchema,
  transparencySchema,
  uiSchema,
  whatHappenedSchema,
} from "./schema";

/**
 * Punto de entrada del contenido versionado, **por idioma** (ADR-023).
 *
 * La validación ocurre acá, al importar: si un JSON no cumple su esquema, el
 * build falla con el nombre del archivo y el campo, en lugar de renderizar una
 * página incompleta. El inglés se valida igual que el castellano: no hay un
 * fallback silencioso al original. Una página con `lang="en"` y prosa en
 * castellano sería una afirmación falsa para el lector de pantalla.
 *
 * `server-only` es la frontera que ADR-022 tuvo que descubrir midiendo. Si un
 * componente de cliente vuelve a importar este módulo, el build falla en lugar
 * de llevarse Zod y diez JSON al navegador.
 */

function pack(
  locale: Locale,
  files: {
    site: unknown;
    ui: unknown;
    norma: unknown;
    quePaso: unknown;
    reconstruccion: unknown;
    ayudar: unknown;
    transparencia: unknown;
    legado: unknown;
    riachoConecta: unknown;
    preguntas: unknown;
    legales: unknown;
  },
) {
  const prefix = `${locale}/`;

  return {
    site: parseContent(siteSchema, files.site, `${prefix}site.json`),
    ui: parseContent(uiSchema, files.ui, `${prefix}ui.json`),
    norma: parseContent(personSchema, files.norma, `${prefix}norma.json`),
    whatHappened: parseContent(
      whatHappenedSchema,
      files.quePaso,
      `${prefix}que-paso.json`,
    ),
    reconstruction: parseContent(
      reconstructionSchema,
      files.reconstruccion,
      `${prefix}reconstruccion.json`,
    ),
    help: parseContent(helpSchema, files.ayudar, `${prefix}ayudar.json`),
    transparency: parseContent(
      transparencySchema,
      files.transparencia,
      `${prefix}transparencia.json`,
    ),
    legacy: parseContent(pageSchema, files.legado, `${prefix}legado.json`),
    riachoConecta: parseContent(
      programSchema,
      files.riachoConecta,
      `${prefix}riacho-conecta.json`,
    ),
    faq: parseContent(faqSchema, files.preguntas, `${prefix}preguntas.json`),
    legal: parseContent(legalSchema, files.legales, `${prefix}legales.json`),
  };
}

const packs = {
  es: pack("es", {
    site: siteEs,
    ui: uiEs,
    norma: normaEs,
    quePaso: quePasoEs,
    reconstruccion: reconstruccionEs,
    ayudar: ayudarEs,
    transparencia: transparenciaEs,
    legado: legadoEs,
    riachoConecta: riachoConectaEs,
    preguntas: preguntasEs,
    legales: legalesEs,
  }),
  en: pack("en", {
    site: siteEn,
    ui: uiEn,
    norma: normaEn,
    quePaso: quePasoEn,
    reconstruccion: reconstruccionEn,
    ayudar: ayudarEn,
    transparencia: transparenciaEn,
    legado: legadoEn,
    riachoConecta: riachoConectaEn,
    preguntas: preguntasEn,
    legales: legalesEn,
  }),
} as const;

export type ContentPack = (typeof packs)[Locale];

export function getContent(locale: Locale): ContentPack {
  return packs[locale];
}

export * from "./schema";
