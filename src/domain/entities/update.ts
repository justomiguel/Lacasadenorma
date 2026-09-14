import { referencedMediaIds } from "../rich-text";

import { isPhoto, type MediaAsset } from "./media";

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
 * La foto que acompaña la entrada en el índice y en la obra.
 *
 * No es la previa de WhatsApp (ADR-036 usa la tarjeta de la marca). Es la
 * miniatura del sumario: la primera foto que el relato nombra, y si el cuerpo
 * no nombra ninguna, la primera adjunta. Un video no hace de miniatura.
 */
export function coverPhoto(
  update: Pick<UpdateRecord, "body" | "media">,
): MediaAsset | null {
  const photos = new Map(
    update.media.filter(isPhoto).map((item) => [item.id, item] as const),
  );

  for (const id of referencedMediaIds(update.body)) {
    const photo = photos.get(id);

    if (photo !== undefined) {
      return photo;
    }
  }

  return update.media.find(isPhoto) ?? null;
}
