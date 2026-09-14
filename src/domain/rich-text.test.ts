import { describe, expect, it } from "vitest";

import {
  excerpt,
  parseRichText,
  referencedMediaIds,
  richTextToPlainText,
  serializeRichText,
} from "./rich-text";

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

  it("reconoce una foto y un video intercalados por su uuid", () => {
    const foto = "11111111-1111-4111-8111-111111111111";
    const video = "22222222-2222-4222-8222-222222222222";
    const blocks = parseRichText(
      `Llegaron las chapas.\n\n![Cabriadas de madera apoyadas sobre los muros](media:${foto})\n\n![La colada del contrapiso](video:${video})`,
    );

    expect(blocks).toEqual([
      {
        kind: "paragraph",
        content: [{ kind: "text", value: "Llegaron las chapas." }],
      },
      {
        kind: "figure",
        mediaId: foto,
        alt: "Cabriadas de madera apoyadas sobre los muros",
      },
      { kind: "video", mediaId: video, alt: "La colada del contrapiso" },
    ]);
  });

  it("no convierte en figura una imagen con URL http(s) ni un uuid mal formado", () => {
    // La lista es blanca: media: y video:. Cualquier otra cosa —un tracker, un
    // javascript:, un uuid truncado— queda como texto, que es lo que quien lo
    // escribió ve y lo que React escapa.
    expect(parseRichText("![techo](https://ejemplo.test/techo.jpg)")).toEqual([
      {
        kind: "paragraph",
        content: [{ kind: "text", value: "![techo](https://ejemplo.test/techo.jpg)" }],
      },
    ]);
    expect(parseRichText("![techo](media:no-es-un-uuid)")).toEqual([
      {
        kind: "paragraph",
        content: [{ kind: "text", value: "![techo](media:no-es-un-uuid)" }],
      },
    ]);
  });

  it("trata como párrafo un bloque que mezcla prosa y una figura", () => {
    const id = "11111111-1111-4111-8111-111111111111";

    expect(parseRichText(`Mirá ![techo](media:${id}) acá.`)).toEqual([
      {
        kind: "paragraph",
        content: [{ kind: "text", value: `Mirá ![techo](media:${id}) acá.` }],
      },
    ]);
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

describe("serializeRichText", () => {
  it("redondea un cuerpo con figura y lista al mismo markdown", () => {
    const source =
      "El **techo** está.\n\n![Cabriadas de madera](media:11111111-1111-4111-8111-111111111111)\n\n- chapas\n- clavos";

    expect(serializeRichText(parseRichText(source))).toBe(source);
  });
});

describe("referencedMediaIds", () => {
  it("devuelve los uuid de figura y video, en orden, sin repetir", () => {
    const foto = "11111111-1111-4111-8111-111111111111";
    const video = "22222222-2222-4222-8222-222222222222";

    expect(
      referencedMediaIds(
        `![una](media:${foto})\n\ntexto\n\n![otra](video:${video})\n\n![de nuevo](media:${foto})`,
      ),
    ).toEqual([foto, video]);
  });
});

describe("richTextToPlainText", () => {
  it("descarta el marcado y conserva el texto", () => {
    expect(
      richTextToPlainText("### Avance\n\nEl **techo** está.\n\n- chapas\n- clavos"),
    ).toBe("Avance El techo está. chapas clavos");
  });

  it("no mete el alt de una foto en el texto plano", () => {
    // El alt describe la foto para quien no la ve; el resumen de la novedad es
    // el relato. Mezclarlos haría que la metadata oliera a pie de foto.
    expect(
      richTextToPlainText(
        "Llegaron las chapas.\n\n![Cabriadas de madera](media:11111111-1111-4111-8111-111111111111)",
      ),
    ).toBe("Llegaron las chapas.");
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
