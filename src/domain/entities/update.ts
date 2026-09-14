import { referencedMediaIds } from "../rich-text";

import { isPhoto, type CoverImage, type MediaAsset } from "./media";

export interface UpdateRecord {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Markdown restringido. Nunca HTML crudo: sería un XSS de administración (T4). */
  readonly body: string;
  readonly publishedAt: string | null;
  readonly media: readonly MediaAsset[];
}

/**
 * La imagen que acompaña la entrada en el índice, en la obra y al compartir.
 *
 * Es el primer visual del relato: una foto, o el fotograma 10 de un video
 * (ADR-038). Si el cuerpo no nombra ninguno, el primer adjunto que tenga
 * imagen. Un video sin póster se saltea: no se inventa un cuadro.
 */
export function coverPhoto(
  update: Pick<UpdateRecord, "body" | "media">,
): CoverImage | null {
  const byId = new Map(update.media.map((item) => [item.id, item] as const));

  for (const id of referencedMediaIds(update.body)) {
    const item = byId.get(id);
    const cover = item === undefined ? null : coverOf(item);

    if (cover !== null) {
      return cover;
    }
  }

  for (const item of update.media) {
    const cover = coverOf(item);

    if (cover !== null) {
      return cover;
    }
  }

  return null;
}

function coverOf(item: MediaAsset): CoverImage | null {
  if (isPhoto(item)) {
    return {
      url: item.url,
      alt: item.alt,
      width: item.width,
      height: item.height,
    };
  }

  if (
    item.posterUrl === null ||
    item.posterWidth === null ||
    item.posterHeight === null
  ) {
    return null;
  }

  return {
    url: item.posterUrl,
    alt: item.alt,
    width: item.posterWidth,
    height: item.posterHeight,
  };
}
