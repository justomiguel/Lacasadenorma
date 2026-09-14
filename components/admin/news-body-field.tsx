"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

import { cn } from "@/components/design-system/cn";
import type { MediaAsset } from "@/src/domain/entities";

import { CONTROL, FieldFrame, useField } from "./form-field";
import { editorJsonToMarkdown, markdownToEditorJson } from "./news-editor-document";
import { WorkMedia } from "./news-editor-media";
import { withMediaSources } from "./news-editor-sources";
import {
  EditorToolButton,
  MediaInsertPanel,
  type MediaUploadFn,
} from "./news-editor-toolbar";

export function NewsBodyField({
  name,
  label,
  hint,
  required,
  defaultValue,
  allowMedia = false,
  updateId,
  slug,
  media = [],
  uploadMedia,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue: string;
  allowMedia?: boolean;
  updateId?: string;
  slug?: string;
  media?: readonly MediaAsset[];
  uploadMedia?: MediaUploadFn;
}) {
  const field = useField(name, hint);
  const [body, setBody] = useState(defaultValue);
  const [pendingKind, setPendingKind] = useState<"photo" | "video" | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        code: false,
        codeBlock: false,
        strike: false,
        orderedList: false,
        horizontalRule: false,
        underline: false,
        link: false,
      }),
      Link.configure({ openOnClick: false, autolink: false }),
      WorkMedia,
    ],
    content: withMediaSources(markdownToEditorJson(defaultValue), media),
    editorProps: {
      attributes: {
        id: field.id,
        class: cn(CONTROL, "min-h-6xl overflow-auto"),
      },
    },
    onUpdate: ({ editor: instance }) => {
      setBody(editorJsonToMarkdown(instance.getJSON()));
    },
  });

  const canInsert =
    allowMedia &&
    updateId !== undefined &&
    slug !== undefined &&
    uploadMedia !== undefined &&
    editor !== null;

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={undefined}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <textarea
        name={name}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required={required}
        rows={12}
        className={editor === null ? CONTROL : "sr-only"}
        aria-hidden={editor === null ? undefined : true}
        tabIndex={editor === null ? undefined : -1}
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(editor === null ? { id: field.id } : {})}
      />

      {editor === null ? null : (
        <div className="space-y-sm">
          <div
            className="flex flex-wrap gap-2xs"
            role="toolbar"
            aria-label="Formato del texto"
          >
            <EditorToolButton
              label="Negrita"
              pressed={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              N
            </EditorToolButton>
            <EditorToolButton
              label="Cursiva"
              pressed={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              C
            </EditorToolButton>
            <EditorToolButton
              label="Subtítulo"
              pressed={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              Tít
            </EditorToolButton>
            <EditorToolButton
              label="Lista"
              pressed={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              Lista
            </EditorToolButton>
            <EditorToolButton
              label="Cita"
              pressed={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              Cita
            </EditorToolButton>
            <EditorToolButton
              label="Enlace"
              pressed={editor.isActive("link")}
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
            {canInsert ? (
              <>
                <EditorToolButton
                  label="Insertar foto"
                  onClick={() => setPendingKind("photo")}
                >
                  Foto
                </EditorToolButton>
                <EditorToolButton
                  label="Insertar video"
                  onClick={() => setPendingKind("video")}
                >
                  Video
                </EditorToolButton>
              </>
            ) : null}
          </div>

          {pendingKind !== null &&
          updateId !== undefined &&
          slug !== undefined &&
          uploadMedia !== undefined ? (
            <MediaInsertPanel
              kind={pendingKind}
              updateId={updateId}
              slug={slug}
              upload={uploadMedia}
              onCancel={() => setPendingKind(null)}
              onInserted={(item) => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "workMedia",
                    attrs: {
                      mediaId: item.mediaId,
                      alt: item.alt,
                      kind: item.kind,
                      src: item.url,
                    },
                  })
                  .run();
                setPendingKind(null);
              }}
            />
          ) : null}

          <EditorContent editor={editor} />
        </div>
      )}
    </FieldFrame>
  );
}
