"use client";

import Image from "next/image";

import { isPhoto, type MediaAsset } from "@/src/domain/entities";

import { EditorToolButton } from "./news-editor-toolbar";

/**
 * Los medios ya adjuntos a esta novedad. Insertarlos otra vez no los vuelve a
 * subir: el archivo está, el cuerpo sólo tiene que nombrar el id (FR-402).
 */
export function NewsMediaLibrary({
  media,
  onInsert,
}: {
  media: readonly MediaAsset[];
  onInsert: (item: MediaAsset) => void;
}) {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-sm" data-news-library="">
      <p className="font-ui text-small font-medium text-ink">Ya adjuntos</p>
      <ul className="space-y-sm">
        {media.map((item) => (
          <li key={item.id} className="flex items-start gap-sm">
            {isPhoto(item) ? (
              <Image
                src={item.url}
                alt={item.alt}
                width={96}
                height={72}
                className="h-auto w-4xl rounded-sm object-cover"
              />
            ) : (
              <p className="w-4xl font-ui text-small text-ink-muted">Video</p>
            )}
            <div className="min-w-0 space-y-2xs">
              <p className="font-ui text-small text-ink-muted">{item.alt}</p>
              <EditorToolButton
                label={`Poner en el texto: ${item.alt}`}
                onClick={() => onInsert(item)}
              >
                Poner en el texto
              </EditorToolButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
