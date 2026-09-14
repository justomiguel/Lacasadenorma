import type { MediaKind } from "@/src/domain/entities";

import { inspectImage, storageKeyFor } from "./image";
import { inspectVideo, sniffVideoType, videoStorageKey } from "./video";

export interface InspectedUpload {
  readonly kind: MediaKind;
  readonly bucketId: "fotos" | "videos";
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly key: string;
}

/**
 * Decide si el archivo es foto o video por el contenido, y arma la clave de
 * storage. Las dos inspecciones viven en sus archivos; acá sólo se elige puerta.
 */
export async function inspectUpload(file: File): Promise<InspectedUpload> {
  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());

  if (sniffVideoType(header) !== null) {
    const info = await inspectVideo(file);

    return {
      kind: "video",
      bucketId: "videos",
      mimeType: info.mimeType,
      width: info.width,
      height: info.height,
      key: videoStorageKey(info.mimeType),
    };
  }

  const info = await inspectImage(file);

  return {
    kind: "photo",
    bucketId: "fotos",
    mimeType: info.mimeType,
    width: info.width,
    height: info.height,
    key: storageKeyFor(info.mimeType),
  };
}
