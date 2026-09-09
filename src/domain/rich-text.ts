/**
 * El subconjunto de Markdown que una novedad puede usar.
 *
 * Esto no es un detalle de presentación: es la frontera que impide que un texto
 * cargado desde el backoffice se convierta en HTML ejecutable en la página
 * pública (amenaza T4, "XSS de administración"). Por eso vive en el dominio y no
 * en un componente.
 *
 * La garantía es estructural, no una lista de cosas prohibidas: el parser
 * **produce nodos**, no cadenas, y no existe un nodo que represente HTML crudo.
 * Un `<script>` escrito en el cuerpo de una novedad sale del parser como texto
 * literal, y React lo escapa. No hay forma de sanear mal algo que nunca se
 * interpretó como marcado.
 *
 * El subconjunto es chico a propósito (principio III). Es lo que hace falta para
 * escribir "el jueves llegaron los ladrillos" desde un teléfono:
 *
 * - Párrafos separados por una línea en blanco.
 * - Subtítulos con `###`. Sólo ese nivel: la página ya usa `h1` y `h2`, así que
 *   un subtítulo dentro del cuerpo es un `h3` y cualquier otro nivel rompería la
 *   jerarquía del documento.
 * - Listas con `- `.
 * - Citas con `> `.
 * - En línea: `**fuerte**`, `_énfasis_` y `[texto](url)`.
 *
 * Todo lo demás es texto. Una sintaxis que no se reconoce no es un error: se
 * publica tal como se escribió, que es lo que quien escribió esperaba ver.
 */

export type InlineNode =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "strong"; readonly value: string }
  | { readonly kind: "emphasis"; readonly value: string }
  | { readonly kind: "link"; readonly value: string; readonly href: string };

export type BlockNode =
  | { readonly kind: "paragraph"; readonly content: readonly InlineNode[] }
  | { readonly kind: "heading"; readonly content: readonly InlineNode[] }
  | { readonly kind: "quote"; readonly content: readonly InlineNode[] }
  | { readonly kind: "list"; readonly items: readonly (readonly InlineNode[])[] };

/**
 * Sólo `https:`, `mailto:` y rutas internas.
 *
 * `javascript:` es el vector obvio, pero la lista es blanca y no negra: `data:`
 * también ejecuta, y mañana hay otro esquema. Un enlace con destino rechazado
 * **no desaparece**: se degrada a texto, para que quien lo escribió lo vea en la
 * página y entienda que ese destino no se publica (principio XII).
 */
function isPublishableHref(href: string): boolean {
  if (href.startsWith("/") || href.startsWith("#")) {
    return true;
  }

  try {
    const { protocol } = new URL(href);

    return protocol === "https:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

const INLINE_PATTERN = /\*\*(.+?)\*\*|_(.+?)_|\[([^\]]+)\]\(([^\s)]+)\)/g;

function parseInline(source: string): readonly InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;

  for (const match of source.matchAll(INLINE_PATTERN)) {
    const [raw, strong, emphasis, linkText, href] = match;

    if (match.index > cursor) {
      nodes.push({ kind: "text", value: source.slice(cursor, match.index) });
    }

    cursor = match.index + raw.length;

    if (strong !== undefined) {
      nodes.push({ kind: "strong", value: strong });
    } else if (emphasis !== undefined) {
      nodes.push({ kind: "emphasis", value: emphasis });
    } else if (linkText !== undefined && href !== undefined) {
      nodes.push(
        isPublishableHref(href)
          ? { kind: "link", value: linkText, href }
          : { kind: "text", value: raw },
      );
    }
  }

  if (cursor < source.length) {
    nodes.push({ kind: "text", value: source.slice(cursor) });
  }

  return nodes;
}

/**
 * Convierte el cuerpo de una novedad en bloques.
 *
 * Un cuerpo vacío devuelve una lista vacía, no un párrafo en blanco: la página
 * decide qué hacer con la ausencia, y un `<p></p>` no le sirve a nadie.
 */
export function parseRichText(source: string): readonly BlockNode[] {
  const blocks: BlockNode[] = [];

  for (const chunk of source.split(/\n\s*\n/)) {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      continue;
    }

    // Una lista o una cita se reconocen por el prefijo de **todas** sus líneas.
    // Si sólo algunas lo tienen, el bloque es un párrafo y los guiones son
    // guiones: adivinar la intención de un texto mixto produce sorpresas.
    if (lines.every((line) => line.startsWith("- "))) {
      blocks.push({
        kind: "list",
        items: lines.map((line) => parseInline(line.slice(2).trim())),
      });

      continue;
    }

    if (lines.every((line) => line.startsWith("> "))) {
      blocks.push({
        kind: "quote",
        content: parseInline(lines.map((line) => line.slice(2).trim()).join(" ")),
      });

      continue;
    }

    if (lines.length === 1 && lines[0]?.startsWith("### ") === true) {
      blocks.push({ kind: "heading", content: parseInline(lines[0].slice(4).trim()) });

      continue;
    }

    // Un salto de línea simple dentro de un párrafo es un salto de escritura, no
    // de lectura: las líneas se unen con un espacio.
    blocks.push({ kind: "paragraph", content: parseInline(lines.join(" ")) });
  }

  return blocks;
}

/**
 * El texto plano de un cuerpo, para la `description` de la metadata y para la
 * salida de las capacidades de agentes.
 *
 * Se deriva del árbol ya parseado en lugar de borrar símbolos con expresiones
 * regulares: así el resumen no puede contener marcado que la página sí interpretó,
 * ni al revés.
 */
export function richTextToPlainText(source: string): string {
  return parseRichText(source)
    .map((block) =>
      block.kind === "list"
        ? block.items.map(inlineToPlainText).join(" ")
        : inlineToPlainText(block.content),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function inlineToPlainText(nodes: readonly InlineNode[]): string {
  return nodes.map((node) => node.value).join("");
}

/** Recorta en un límite de palabra, para una `description` de metadata. */
export function excerpt(source: string, maxLength = 155): string {
  const text = richTextToPlainText(source);

  if (text.length <= maxLength) {
    return text;
  }

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, "")}…`;
}
