/**
 * Ida y vuelta entre el JSON de TipTap y el Markdown del dominio.
 *
 * El editor nunca es la fuente de verdad: si TipTap produce un nodo que el
 * dominio no conoce, se degrada a texto. Así un pegado raro no se convierte en
 * HTML publicado (ADR-034, T4).
 */

import type { JSONContent } from "@tiptap/core";

import {
  parseRichText,
  serializeRichText,
  type BlockNode,
  type InlineNode,
} from "@/src/domain/rich-text";

export const WORK_MEDIA_NODE = "workMedia";

/** TipTap tipa `attrs` como `any`; se lee como `unknown` y se estrecha. */
export function stringAttr(source: unknown, key: string): string | undefined {
  if (source === null || typeof source !== "object") {
    return undefined;
  }

  const value: unknown = (source as Record<string, unknown>)[key];

  return typeof value === "string" ? value : undefined;
}

function marksOf(node: JSONContent): ReadonlySet<string> {
  return new Set((node.marks ?? []).map((mark) => mark.type));
}

function inlineFromText(node: JSONContent): InlineNode {
  const text = node.text ?? "";
  const marks = marksOf(node);

  if (marks.has("link")) {
    const href = stringAttr(
      node.marks?.find((mark) => mark.type === "link")?.attrs,
      "href",
    );

    if (href !== undefined) {
      return { kind: "link", value: text, href };
    }
  }

  if (marks.has("bold")) {
    return { kind: "strong", value: text };
  }

  if (marks.has("italic")) {
    return { kind: "emphasis", value: text };
  }

  return { kind: "text", value: text };
}

function inlinesFrom(nodes: readonly JSONContent[] | undefined): InlineNode[] {
  const inlines: InlineNode[] = [];

  for (const node of nodes ?? []) {
    if (node.type === "text") {
      inlines.push(inlineFromText(node));
      continue;
    }

    if (node.type === "hardBreak") {
      inlines.push({ kind: "text", value: " " });
      continue;
    }

    inlines.push(...inlinesFrom(node.content));
  }

  return inlines;
}

function listItemsFrom(node: JSONContent): InlineNode[][] {
  return (node.content ?? []).map((item) => inlinesFrom(item.content));
}

export function editorNodeToBlocks(node: JSONContent): BlockNode[] {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).flatMap(editorNodeToBlocks);
    case "paragraph":
      return [{ kind: "paragraph", content: inlinesFrom(node.content) }];
    case "heading":
      return [{ kind: "heading", content: inlinesFrom(node.content) }];
    case "blockquote":
      return [{ kind: "quote", content: inlinesFrom(node.content) }];
    case "bulletList":
      return [{ kind: "list", items: listItemsFrom(node) }];
    case WORK_MEDIA_NODE: {
      const mediaId = stringAttr(node.attrs, "mediaId");
      const alt = stringAttr(node.attrs, "alt");
      const kind = stringAttr(node.attrs, "kind");

      if (mediaId === undefined || alt === undefined) {
        return [];
      }

      return kind === "video"
        ? [{ kind: "video", mediaId, alt }]
        : [{ kind: "figure", mediaId, alt }];
    }
    default:
      return inlinesFrom(node.content).length > 0
        ? [{ kind: "paragraph", content: inlinesFrom(node.content) }]
        : [];
  }
}

export function editorJsonToMarkdown(doc: JSONContent): string {
  return serializeRichText(editorNodeToBlocks(doc));
}

function textNode(inline: InlineNode): JSONContent {
  switch (inline.kind) {
    case "text":
      return { type: "text", text: inline.value };
    case "strong":
      return { type: "text", text: inline.value, marks: [{ type: "bold" }] };
    case "emphasis":
      return { type: "text", text: inline.value, marks: [{ type: "italic" }] };
    case "link":
      return {
        type: "text",
        text: inline.value,
        marks: [{ type: "link", attrs: { href: inline.href } }],
      };
  }
}

function paragraphContent(inlines: readonly InlineNode[]): JSONContent[] {
  return inlines.length === 0 ? [] : inlines.map(textNode);
}

export function blocksToEditorContent(blocks: readonly BlockNode[]): JSONContent[] {
  return blocks.map((block) => {
    switch (block.kind) {
      case "paragraph":
        return { type: "paragraph", content: paragraphContent(block.content) };
      case "heading":
        return {
          type: "heading",
          attrs: { level: 3 },
          content: paragraphContent(block.content),
        };
      case "quote":
        return {
          type: "blockquote",
          content: [{ type: "paragraph", content: paragraphContent(block.content) }],
        };
      case "list":
        return {
          type: "bulletList",
          content: block.items.map((item) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: paragraphContent(item) }],
          })),
        };
      case "figure":
      case "video":
        return {
          type: WORK_MEDIA_NODE,
          attrs: {
            mediaId: block.mediaId,
            alt: block.alt,
            kind: block.kind === "video" ? "video" : "photo",
          },
        };
    }
  });
}

export function markdownToEditorJson(source: string): JSONContent {
  const content = blocksToEditorContent(parseRichText(source));

  return {
    type: "doc",
    content: content.length === 0 ? [{ type: "paragraph" }] : content,
  };
}
