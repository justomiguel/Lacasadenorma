import type { Editor } from "@tiptap/core";

import { WORK_MEDIA_NODE } from "./news-editor-document";

/** Lo que el cursor tiene puesto. Se lee en cada selección, no sólo al tipear. */
export function editorFormat(editor: Editor) {
  return {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    heading: editor.isActive("heading", { level: 3 }),
    list: editor.isActive("bulletList"),
    quote: editor.isActive("blockquote"),
    link: editor.isActive("link"),
    media: editor.isActive(WORK_MEDIA_NODE),
  };
}
