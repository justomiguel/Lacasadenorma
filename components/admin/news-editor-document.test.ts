import { describe, expect, it } from "vitest";

import {
  editorJsonToMarkdown,
  markdownToEditorJson,
  WORK_MEDIA_NODE,
} from "./news-editor-document";

describe("ida y vuelta del editor", () => {
  it("redondea negrita, lista y una foto intercalada", () => {
    const source =
      "El **techo** está.\n\n![Cabriadas de madera](media:11111111-1111-4111-8111-111111111111)\n\n- chapas\n- clavos";

    expect(editorJsonToMarkdown(markdownToEditorJson(source))).toBe(source);
  });

  it("un nodo desconocido no se vuelve HTML: se degrada a párrafo", () => {
    const markdown = editorJsonToMarkdown({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          content: [{ type: "text", text: "<script>alert(1)</script>" }],
        },
      ],
    });

    expect(markdown).toContain("<script>alert(1)</script>");
    expect(markdown).not.toContain("<code");
  });

  it("nombra el nodo de media con el id, no con una URL", () => {
    const doc = markdownToEditorJson(
      "![La colada](video:22222222-2222-4222-8222-222222222222)",
    );

    expect(doc.content?.[0]).toMatchObject({
      type: WORK_MEDIA_NODE,
      attrs: {
        mediaId: "22222222-2222-4222-8222-222222222222",
        kind: "video",
        alt: "La colada",
      },
    });
  });
});
