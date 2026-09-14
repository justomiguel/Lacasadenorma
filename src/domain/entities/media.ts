/**
 * Un archivo de la obra: foto o video. `alt` es obligatorio en el tipo y en el
 * esquema de la base (FR-024): el formulario puede cambiar, la base no.
 *
 * `width` y `height` son obligatorios porque sin dimensiones reales hay CLS, y
 * los Core Web Vitals son requisito funcional (principio VII). En un video son
 * el marco de reproducción (`aspect-wide`). El fotograma 10, si se pudo
 * extraer al subir, vive en `posterUrl` (ADR-038).
 */

export type MediaKind = "photo" | "video";

export interface MediaAsset {
  readonly id: string;
  readonly kind: MediaKind;
  readonly bucketId: string;
  readonly url: string;
  readonly alt: string;
  readonly caption: string | null;
  readonly credit: string | null;
  readonly width: number;
  readonly height: number;
  readonly takenOn: string | null;
  /**
   * JPEG del fotograma 10, sólo en un video. Null en una foto y en un video
   * al que no se le pudo extraer el cuadro (ADR-038).
   */
  readonly posterUrl: string | null;
  readonly posterWidth: number | null;
  readonly posterHeight: number | null;
}

/** Lo que el índice, la obra y Open Graph necesitan de una tapa. */
export interface CoverImage {
  readonly url: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export function isPhoto(media: MediaAsset): boolean {
  return media.kind === "photo";
}

export function isVideo(media: MediaAsset): boolean {
  return media.kind === "video";
}
