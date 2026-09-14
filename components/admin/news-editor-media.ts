import { Node, mergeAttributes } from "@tiptap/core";

import { stringAttr, WORK_MEDIA_NODE } from "./news-editor-document";

/**
 * Foto o video intercalado. Es un átomo: no se edita por dentro, se inserta o
 * se borra. El HTML que TipTap usa para pintarlo en el admin no sale del
 * backoffice; el documento canónico es el Markdown del dominio (ADR-034).
 */
export const WorkMedia = Node.create({
  name: WORK_MEDIA_NODE,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      mediaId: { default: null },
      alt: { default: "" },
      kind: { default: "photo" },
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-work-media]` }];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = stringAttr(HTMLAttributes, "kind") === "video" ? "video" : "photo";
    const alt = stringAttr(HTMLAttributes, "alt") ?? "";
    const src = stringAttr(HTMLAttributes, "src");

    if (kind === "video" && typeof src === "string") {
      return [
        "div",
        mergeAttributes(HTMLAttributes, { "data-work-media": kind }),
        ["video", { controls: "true", src, "aria-label": alt }],
      ];
    }

    if (typeof src === "string") {
      return [
        "div",
        mergeAttributes(HTMLAttributes, { "data-work-media": kind }),
        ["img", { src, alt }],
      ];
    }

    return ["div", mergeAttributes(HTMLAttributes, { "data-work-media": kind }), alt];
  },
});
