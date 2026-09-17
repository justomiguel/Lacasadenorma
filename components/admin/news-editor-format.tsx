"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";

import { editorFormat } from "./news-editor-marks";
import { EditorToolButton } from "./news-editor-toolbar";

export function NewsFormatToolbar({ editor }: { editor: Editor }) {
  const marks = useEditorState({
    editor,
    selector: ({ editor: instance }) => editorFormat(instance),
  });

  return (
    <div className="flex flex-wrap gap-2xs" role="toolbar" aria-label="Formato del texto">
      <EditorToolButton
        label="Negrita"
        pressed={marks.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        N
      </EditorToolButton>
      <EditorToolButton
        label="Cursiva"
        pressed={marks.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        C
      </EditorToolButton>
      <EditorToolButton
        label="Subtítulo"
        pressed={marks.heading}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        Tít
      </EditorToolButton>
      <EditorToolButton
        label="Lista"
        pressed={marks.list}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        Lista
      </EditorToolButton>
      <EditorToolButton
        label="Cita"
        pressed={marks.quote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Cita
      </EditorToolButton>
      <EditorToolButton
        label="Enlace"
        pressed={marks.link}
        onClick={() => {
          const href = window.prompt("Dirección del enlace (https:// o /ruta)");

          if (href === null) {
            return;
          }

          if (href.trim().length === 0) {
            editor.chain().focus().unsetLink().run();
            return;
          }

          editor.chain().focus().setLink({ href: href.trim() }).run();
        }}
      >
        Link
      </EditorToolButton>
    </div>
  );
}
