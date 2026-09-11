import { describe, expect, it } from "vitest";

import { excerpt, parseRichText, richTextToPlainText } from "./rich-text";

describe("parseRichText", () => {
  it("separa párrafos por línea en blanco y une los saltos simples", () => {
    const blocks = parseRichText("Primero\ncon dos líneas.\n\nSegundo.");

    expect(blocks).toEqual([
      {
        kind: "paragraph",
        content: [{ kind: "text", value: "Primero con dos líneas." }],
      },
      { kind: "paragraph", content: [{ kind: "text", value: "Segundo." }] },
    ]);
  });

  it("reconoce subtítulos de nivel tres", () => {
    expect(parseRichText("### Llegaron los ladrillos")).toEqual([
      { kind: "heading", content: [{ kind: "text", value: "Llegaron los ladrillos" }] },
    ]);
  });

  it("no reconoce otros niveles de encabezado: quedan como texto", () => {
    // La página ya usa h1 y h2. Aceptar `##` produciría un documento con la
    // jerarquía rota, que es peor que un numeral visible.
    const blocks = parseRichText("## Título");

    expect(blocks).toEqual([
      { kind: "paragraph", content: [{ kind: "text", value: "## Título" }] },
    ]);
  });

  it("agrupa las líneas con guion en una sola lista", () => {
    expect(parseRichText("- chapas\n- clavos")).toEqual([
      {
        kind: "list",
        items: [[{ kind: "text", value: "chapas" }], [{ kind: "text", value: "clavos" }]],
      },
    ]);
  });

  it("trata como párrafo un bloque donde sólo algunas líneas tienen guion", () => {
    const blocks = parseRichText("Compramos:\n- chapas");

    expect(blocks).toEqual([
      { kind: "paragraph", content: [{ kind: "text", value: "Compramos: - chapas" }] },
    ]);
  });

  it("reconoce citas", () => {
    expect(parseRichText("> Gracias a todos.")).toEqual([
      { kind: "quote", content: [{ kind: "text", value: "Gracias a todos." }] },
    ]);
  });

  it("reconoce fuerte, énfasis y enlaces en línea", () => {
    const blocks = parseRichText(
      "El **techo** ya está, _por fin_. Detalle en [la obra](/reconstruccion).",
    );

    expect(blocks).toEqual([
      {
        kind: "paragraph",
        content: [
          { kind: "text", value: "El " },
          { kind: "strong", value: "techo" },
          { kind: "text", value: " ya está, " },
          { kind: "emphasis", value: "por fin" },
          { kind: "text", value: ". Detalle en " },
          { kind: "link", value: "la obra", href: "/reconstruccion" },
          { kind: "text", value: "." },
        ],
      },
    ]);
  });

  it("devuelve una lista vacía para un cuerpo vacío", () => {
    expect(parseRichText("")).toEqual([]);
    expect(parseRichText("   \n\n  ")).toEqual([]);
  });

  describe("no produce marcado ejecutable", () => {
    it("deja el HTML como texto literal", () => {
      // Es la garantía central: no hay nodo que represente HTML, así que un
      // `<script>` no tiene forma de llegar al documento como elemento.
      const blocks = parseRichText('<script>alert("hola")</script>');

      expect(blocks).toEqual([
        {
          kind: "paragraph",
          content: [{ kind: "text", value: '<script>alert("hola")</script>' }],
        },
      ]);
    });

    it.each([
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "http://ejemplo.test",
      "vbscript:msgbox(1)",
      "JavaScript:alert(1)",
    ])("no produce un enlace con destino %s", (href) => {
      // Se comprueba la ausencia del nodo, no el texto exacto que queda: cómo se
      // muestre un destino rechazado puede cambiar, que no se pueda hacer click
      // no.
      const blocks = parseRichText(`Mirá [acá](${href}).`);

      expect(
        blocks.flatMap((block) => ("content" in block ? block.content : [])),
      ).not.toContainEqual(expect.objectContaining({ kind: "link" }));
      expect(richTextToPlainText(`Mirá [acá](${href}).`)).toContain(href);
    });

    it.each([
      "https://ejemplo.test/nota",
      "mailto:hola@ejemplo.test",
      "/ayudar",
      "#notas",
    ])("acepta el destino %s", (href) => {
      const blocks = parseRichText(`[acá](${href})`);

      expect(blocks).toEqual([
        {
          kind: "paragraph",
          content: [{ kind: "link", value: "acá", href }],
        },
      ]);
    });
  });
});

describe("richTextToPlainText", () => {
  it("descarta el marcado y conserva el texto", () => {
    expect(
      richTextToPlainText("### Avance\n\nEl **techo** está.\n\n- chapas\n- clavos"),
    ).toBe("Avance El techo está. chapas clavos");
  });
});

describe("excerpt", () => {
  it("devuelve el texto completo si entra en el límite", () => {
    expect(excerpt("Ya está el techo.", 100)).toBe("Ya está el techo.");
  });

  it("corta en un límite de palabra y quita la puntuación colgada", () => {
    expect(excerpt("uno dos tres cuatro cinco", 14)).toBe("uno dos tres…");
  });
});
