import ayudarData from "./ayudar.json";
import legadoData from "./legado.json";
import legalesData from "./legales.json";
import normaData from "./norma.json";
import preguntasData from "./preguntas.json";
import quePasoData from "./que-paso.json";
import reconstruccionData from "./reconstruccion.json";
import riachoConectaData from "./riacho-conecta.json";
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
  whatHappenedSchema,
} from "./schema";
import siteData from "./site.json";
import transparenciaData from "./transparencia.json";

/**
 * Punto de entrada del contenido versionado. La validación ocurre acá, al
 * importar: si un JSON no cumple su esquema, el build falla con el nombre del
 * archivo y el campo, en lugar de renderizar una página incompleta.
 */

export const site = parseContent(siteSchema, siteData, "site.json");
export const norma = parseContent(personSchema, normaData, "norma.json");
export const whatHappened = parseContent(
  whatHappenedSchema,
  quePasoData,
  "que-paso.json",
);
export const reconstruction = parseContent(
  reconstructionSchema,
  reconstruccionData,
  "reconstruccion.json",
);
export const help = parseContent(helpSchema, ayudarData, "ayudar.json");
export const transparency = parseContent(
  transparencySchema,
  transparenciaData,
  "transparencia.json",
);
export const legacy = parseContent(pageSchema, legadoData, "legado.json");
export const riachoConecta = parseContent(
  programSchema,
  riachoConectaData,
  "riacho-conecta.json",
);
export const faq = parseContent(faqSchema, preguntasData, "preguntas.json");
export const legal = parseContent(legalSchema, legalesData, "legales.json");

export * from "./schema";
