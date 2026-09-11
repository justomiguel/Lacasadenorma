/**
 * Una fotografía. `alt` es obligatorio en el tipo y en el esquema de la base
 * (FR-024): el formulario puede cambiar, la base no.
 *
 * `width` y `height` son obligatorios porque sin dimensiones reales hay CLS, y
 * los Core Web Vitals son requisito funcional (principio VII).
 */
export interface MediaAsset {
  readonly id: string;
  readonly url: string;
  readonly alt: string;
  readonly caption: string | null;
  readonly credit: string | null;
  readonly width: number;
  readonly height: number;
  readonly takenOn: string | null;
}
