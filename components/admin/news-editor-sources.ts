import type { JSONContent } from "@tiptap/core";

import type { MediaAsset } from "@/src/domain/entities";

import { stringAttr, WORK_MEDIA_NODE } from "./news-editor-document";

/** Completa el `src` de cada medio para que el admin lo vea sin ir a buscarlo. */
export function withMediaSources(
  doc: JSONContent,
  media: readonly MediaAsset[],
): JSONContent {
  const byId = new Map(media.map((item) => [item.id, item]));

  return {
    ...doc,
    content: (doc.content ?? []).map((node) => {
      if (node.type !== WORK_MEDIA_NODE) {
        return node;
      }

      const id = stringAttr(node.attrs, "mediaId");
      const asset = id === undefined ? undefined : byId.get(id);

      return {
        ...node,
        attrs: {
          ...node.attrs,
          src: asset?.url ?? null,
          kind: asset?.kind ?? stringAttr(node.attrs, "kind"),
        },
      };
    }),
  };
}
