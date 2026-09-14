import { Editor } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { editorFormat } from "./news-editor-marks";
import { MediaInsertPanel } from "./news-editor-insert";
import { WorkMedia } from "./news-editor-media";
import { EditorToolButton } from "./news-editor-toolbar";

function editorWith(html: string): Editor {
  return new Editor({
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
    content: html,
  });
}

describe("editorFormat", () => {
  it("lee el formato del cursor, no el último botón que se tocó", () => {
    const editor = editorWith("<p><strong>hola</strong> mundo</p>");

    editor.commands.setTextSelection(2);
    expect(editorFormat(editor).bold).toBe(true);

    editor.commands.setTextSelection(8);
    expect(editorFormat(editor).bold).toBe(false);

    editor.destroy();
  });
});

describe("EditorToolButton", () => {
  it("una herramienta activa se marca con aria-pressed", () => {
    render(
      <EditorToolButton label="Negrita" pressed onClick={() => undefined}>
        N
      </EditorToolButton>,
    );

    expect(screen.getByRole("button", { name: "Negrita" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("MediaInsertPanel", () => {
  it("al insertar, el panel se marca ocupado y muestra la carga sobre la previa", async () => {
    const user = userEvent.setup();
    let finish!: (value: {
      status: string;
      message: string;
      value: { mediaId: string; kind: "photo"; url: string };
    }) => void;
    const upload = vi.fn(
      () =>
        new Promise<{
          status: string;
          message: string;
          value: { mediaId: string; kind: "photo"; url: string };
        }>((resolve) => {
          finish = resolve;
        }),
    );

    render(
      <MediaInsertPanel
        kind="photo"
        updateId="11111111-1111-4111-8111-111111111111"
        slug="obra"
        upload={upload}
        onCancel={() => undefined}
        onInserted={() => undefined}
      />,
    );

    const file = new File(["foto"], "obra.jpg", { type: "image/jpeg" });

    await user.upload(screen.getByLabelText(/^archivo$/i), file);
    await user.type(
      screen.getByLabelText(/^qué se ve$/i),
      "Patio después de juntar escombros",
    );
    await user.click(screen.getByRole("button", { name: /^insertar$/i }));

    const panel = document.querySelector("[data-news-insert=photo]");

    await waitFor(() => {
      expect(panel).toHaveAttribute("aria-busy", "true");
    });
    expect(screen.getByRole("status")).toHaveTextContent("Subiendo la foto…");
    expect(screen.getByRole("button", { name: /subiendo la foto/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();

    finish({
      status: "ok",
      message: "listo",
      value: { mediaId: "media-1", kind: "photo", url: "https://ejemplo.test/obra.jpg" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^insertar$/i })).toBeEnabled();
    });
  });
});
