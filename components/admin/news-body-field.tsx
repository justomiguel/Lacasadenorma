"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

import { cn } from "@/components/design-system/cn";
import type { MediaAsset } from "@/src/domain/entities";

import { CONTROL, FieldFrame, useField } from "./form-field";
import { editorJsonToMarkdown, markdownToEditorJson } from "./news-editor-document";
import { NewsFormatToolbar } from "./news-editor-format";
import { MediaInsertPanel } from "./news-editor-insert";
import { NewsMediaLibrary } from "./news-editor-library";
import { WorkMedia } from "./news-editor-media";
import { withMediaSources } from "./news-editor-sources";
import type { MediaUploadFn } from "./news-editor-toolbar";

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
          <NewsFormatToolbar
            editor={editor}
            canInsert={canInsert}
            pendingKind={pendingKind}
            onInsert={(kind) => {
              setPendingKind((current) => (current === kind ? null : kind));
            }}
          />

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

          {canInsert ? (
            <NewsMediaLibrary
              media={media}
              onInsert={(item) => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "workMedia",
                    attrs: {
                      mediaId: item.id,
                      alt: item.alt,
                      kind: item.kind,
                      src: item.url,
                    },
                  })
                  .run();
              }}
            />
          ) : null}
        </div>
      )}
    </FieldFrame>
  );
}
