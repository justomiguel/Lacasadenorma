"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

import { cn } from "@/components/design-system/cn";
import type { MediaAsset } from "@/src/domain/entities";

import { CONTROL, FieldFrame, useField } from "./form-field";
import { editorJsonToMarkdown, markdownToEditorJson } from "./news-editor-document";
import { NewsFormatToolbar } from "./news-editor-format";
import { WorkMedia } from "./news-editor-media";
import { withMediaSources } from "./news-editor-sources";
import { useNewsMediaInsert } from "./news-media-context";

export function NewsBodyField({
  name,
  label,
  hint,
  required,
  defaultValue,
  media = [],
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue: string;
  media?: readonly MediaAsset[];
}) {
  const field = useField(name, hint);
  const [body, setBody] = useState(defaultValue);
  const mediaInsert = useNewsMediaInsert();

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

  useEffect(() => {
    if (editor === null || mediaInsert === null) {
      return;
    }

    mediaInsert.register((item) => {
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
    });
  }, [editor, mediaInsert]);

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
          <NewsFormatToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>
      )}
    </FieldFrame>
  );
}
