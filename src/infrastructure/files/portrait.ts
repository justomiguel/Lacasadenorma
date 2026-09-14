import { isPortraitMimeType, type PortraitMimeType } from "@/src/domain/entities/donor";

import { inspectImage, UnsupportedFileError, type ImageInfo } from "./image";

/** 2 MiB: el mismo tope del bucket. Un formulario nuevo no puede olvidarlo. */
export const MAX_PORTRAIT_BYTES = 2 * 1024 * 1024;

export interface PortraitInfo extends ImageInfo {
  readonly mimeType: PortraitMimeType;
}

export async function inspectPortrait(file: File): Promise<PortraitInfo> {
  if (file.size > MAX_PORTRAIT_BYTES) {
    throw new UnsupportedFileError(
      "La foto pesa más de 2 MB. Sacale peso y volvé a intentar.",
    );
  }

  const info = await inspectImage(file);

  if (!isPortraitMimeType(info.mimeType)) {
    throw new UnsupportedFileError(
      "No reconocemos el formato del archivo. Se aceptan JPEG, PNG y WebP.",
    );
  }

  return { ...info, mimeType: info.mimeType };
}
