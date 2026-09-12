import { getContent } from "@/content";

const { norma, site } = getContent("es");

/**
 * La historia de Norma.
 *
 * No devuelve `DataResult`: el contenido editorial vive en el repositorio y está
 * validado en tiempo de build (ADR-007), así que **siempre** está disponible. Es
 * lo que permite que el sitio se clone y se vea completo sin credenciales
 * (SC-012).
 */

export interface NormaStory {
  readonly name: string;
  readonly roleLabel: string;
  readonly place: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
  /** Nulas mientras la familia no las publique. No se estiman (data-model). */
  readonly bornOn: string | null;
  readonly diedOn: string | null;
}

export function getNormaStory(): NormaStory {
  return {
    name: norma.fullName,
    roleLabel: norma.roleLabel,
    place: `${site.place.locality}, ${site.place.province}, ${site.place.country}`,
    summary: norma.summary,
    paragraphs: norma.paragraphs,
    bornOn: norma.bornOn,
    diedOn: norma.diedOn,
  };
}
