"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  function insert(item: MediaAsset) {
    onInsert(item);
    setInsertedId(item.id);

    if (timeout.current !== null) {
      clearTimeout(timeout.current);
    }

    timeout.current = setTimeout(() => {
      setInsertedId(null);
    }, 2000);
  }

  if (media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-sm" data-news-library="">
      <p className="font-ui text-small font-medium text-ink">Ya adjuntos</p>
      <p aria-live="polite" className="sr-only">
        {insertedId === null ? null : "Puesto en el texto"}
      </p>
      <ul className="space-y-sm">
        {media.map((item) => {
          const justInserted = insertedId === item.id;

          return (
            <li key={item.id} className="flex items-start gap-sm">
              {isPhoto(item) ? (
                <Image
                  src={item.url}
                  alt={item.alt}
                  width={96}
                  height={72}
                  className="h-auto w-4xl rounded-sm object-cover"
                />
              ) : item.posterUrl === null ? (
                <p className="w-4xl font-ui text-small text-ink-muted">Video</p>
              ) : (
                <Image
                  src={item.posterUrl}
                  alt={item.alt}
                  width={item.posterWidth ?? 96}
                  height={item.posterHeight ?? 72}
                  className="h-auto w-4xl rounded-sm object-cover"
                />
              )}
              <div className="min-w-0 space-y-2xs">
                <p className="font-ui text-small text-ink-muted">{item.alt}</p>
                <EditorToolButton
                  label={
                    justInserted
                      ? `Puesto en el texto: ${item.alt}`
                      : `Poner en el texto: ${item.alt}`
                  }
                  pressed={justInserted}
                  onClick={() => {
                    insert(item);
                  }}
                >
                  {justInserted ? "Puesto" : "Poner en el texto"}
                </EditorToolButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
