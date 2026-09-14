/**
 * Un archivo de la obra: foto o video. `alt` es obligatorio en el tipo y en el
 * esquema de la base (FR-024): el formulario puede cambiar, la base no.
 *
 * `width` y `height` son obligatorios porque sin dimensiones reales hay CLS, y
 * los Core Web Vitals son requisito funcional (principio VII). En un video son
 * el marco de reproducción (`aspect-wide`), no un fotograma inventado.
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
}

export function isPhoto(media: MediaAsset): boolean {
  return media.kind === "photo";
}

export function isVideo(media: MediaAsset): boolean {
  return media.kind === "video";
}
