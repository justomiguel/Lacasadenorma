"use client";

import { useId, useState } from "react";

import type { MediaAsset } from "@/src/domain/entities";

import { MediaInsertPanel } from "./news-editor-insert";
import { NewsMediaLibrary } from "./news-editor-library";
import type { MediaUploadFn } from "./news-editor-toolbar";
import { useNewsMediaInsert } from "./news-media-context";
import { MediaKindTabs, type MediaInsertKind } from "./news-media-kind";

/**
 * Adjuntar foto o video a una novedad ya guardada.
 *
 * Vive fuera del formulario de texto a propósito: un `<input type=file>`
 * adentro del Guardar hacía que se buscara el archivo en la barra de formato
 * y no se encontrara. Acá el archivo, el alt y Adjuntar están a la vista,
 * como estaban antes del editor visual. Después de subir, `revalidatePath`
 * refresca la lista; el editor recibe el medio por el puente.
 */
export function NewsMediaPanel({
  updateId,
  slug,
  media,
  upload,
}: {
  updateId: string;
  slug: string;
  media: readonly MediaAsset[];
  upload: MediaUploadFn;
}) {
  const baseId = useId();
  const bridge = useNewsMediaInsert();
  const [kind, setKind] = useState<MediaInsertKind>("photo");

  return (
    <div className="space-y-md" data-news-media-panel="">
      <MediaKindTabs kind={kind} baseId={baseId} onChange={setKind} />
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${kind}`}
      >
        <MediaInsertPanel
          key={kind}
          kind={kind}
          updateId={updateId}
          slug={slug}
          upload={upload}
          onCancel={null}
          onInserted={(item) => {
            bridge?.insert(item);
          }}
        />
      </div>
      {media.length === 0 ? (
        <p className="font-ui text-small text-ink-muted">
          Todavía no tiene foto ni video. Se intercalan en el texto, donde está el cursor.
        </p>
      ) : (
        <NewsMediaLibrary
          media={media}
          onInsert={(item) => {
            bridge?.insert({
              mediaId: item.id,
              kind: item.kind,
              url: item.url,
              alt: item.alt,
            });
          }}
        />
      )}
    </div>
  );
}
