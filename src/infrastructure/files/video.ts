/**
 * Qué archivo de video es realmente.
 *
 * Misma regla que las fotos (`image.ts`, amenaza T6): el tipo se decide por el
 * contenido, nunca por la extensión ni por el `Content-Type` que declara el
 * navegador. Un SVG o un HTML renombrados a `.mp4` no tienen firma de MP4 ni de
 * WebM, así que caen acá por construcción.
 *
 * Las medidas de un video no se leen del encabezado en esta versión: parsear
 * `tkhd` o el árbol de WebM sería un parser de contenedor en el camino de una
 * subida. Se reserva el marco 16:9 del sistema (`aspect-wide`, 1920×1080) para
 * no producir CLS. No es un fotograma inventado: es el hueco de reproducción.
 */

import { UnsupportedFileError } from "./image";

export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

export type AllowedVideoType = (typeof ALLOWED_VIDEO_TYPES)[number];

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Marco de reproducción cuando no se leen las medidas reales. `aspect-wide`. */
export const VIDEO_DISPLAY_WIDTH = 1920;
export const VIDEO_DISPLAY_HEIGHT = 1080;

export interface VideoInfo {
  readonly mimeType: AllowedVideoType;
  readonly width: number;
  readonly height: number;
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

const MP4_BRANDS = new Set([
  "isom",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "mp71",
  "avc1",
  "mmp4",
  "msnv",
  "ndas",
  "ndsc",
]);

/**
 * Identifica MP4 o WebM por su firma.
 *
 * MP4 y AVIF comparten el contenedor ISOBMFF (`ftyp`). La diferencia es la
 * marca: `avif`/`avis` son imagen y este sniff no las nombra. WebM es EBML.
 */
export function sniffVideoType(bytes: Uint8Array): AllowedVideoType | null {
  const isEbml =
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3;

  if (isEbml) {
    return "video/webm";
  }

  const isFtyp = bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp";

  if (isFtyp && MP4_BRANDS.has(ascii(bytes, 8, 4))) {
    return "video/mp4";
  }

  return null;
}

export async function inspectVideo(file: File): Promise<VideoInfo> {
  if (file.size === 0) {
    throw new UnsupportedFileError("El archivo está vacío.");
  }

  if (file.size > MAX_VIDEO_BYTES) {
    throw new UnsupportedFileError(
      `El archivo pesa más de ${String(Math.round(MAX_VIDEO_BYTES / 1024 / 1024))} MB. Sacale peso y volvé a intentar.`,
    );
  }

  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const type = sniffVideoType(header);

  if (type === null) {
    throw new UnsupportedFileError(
      "No reconocemos el formato del video. Se aceptan MP4 y WebM.",
    );
  }

  return {
    mimeType: type,
    width: VIDEO_DISPLAY_WIDTH,
    height: VIDEO_DISPLAY_HEIGHT,
  };
}

export function videoStorageKey(mimeType: AllowedVideoType, now = new Date()): string {
  const extension = mimeType === "video/webm" ? "webm" : "mp4";
  const stamp = now.toISOString().slice(0, 10);

  return `${stamp}/${crypto.randomUUID()}.${extension}`;
}
