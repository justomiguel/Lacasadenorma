import type { ReactNode } from "react";

import { parseRichText, type BlockNode, type InlineNode } from "@/src/domain/rich-text";

import { InlineLink } from "./actions";
import { cn } from "./cn";

/**
 * Renderiza el cuerpo de una novedad.
 *
 * No hay `dangerouslySetInnerHTML` en ninguna parte, y no es una omisión que haya
 * que recordar mantener: el parser del dominio no produce un nodo que represente
 * HTML, así que no existe nada que se pudiera pasar a esa API. La seguridad la da
 * la forma del tipo, no la disciplina de quien escribe el componente
 * (amenaza T4).
 */

function Inline({ nodes }: { nodes: readonly InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        // El índice es la identidad correcta acá: es una secuencia de texto
        // inmutable dentro de un párrafo, no una lista que se reordene.
        <InlineLeaf key={index} node={node} />
      ))}
    </>
  );
}

function InlineLeaf({ node }: { node: InlineNode }): ReactNode {
  switch (node.kind) {
    case "text":
      return node.value;
    case "strong":
      return <strong className="font-medium">{node.value}</strong>;
    case "emphasis":
      return <em>{node.value}</em>;
    case "link":
      // `target="_blank"` sólo para destinos externos, y siempre con `noopener`:
      // sin él la pestaña abierta puede reescribir la que la abrió.
      return node.href.startsWith("http") ? (
        <InlineLink href={node.href} rel="noopener noreferrer" target="_blank">
          {node.value}
        </InlineLink>
      ) : (
        <InlineLink href={node.href}>{node.value}</InlineLink>
      );
  }
}

function Block({ node }: { node: BlockNode }): ReactNode {
  switch (node.kind) {
    case "heading":
      // `h3` porque el título de la novedad es el `h1` de la página y las
      // secciones del sitio son `h2`. El nivel no es una decisión del componente.
      return (
        <h3 className="mt-xl font-prose text-subheading font-medium first:mt-0">
          <Inline nodes={node.content} />
        </h3>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-brick pl-lg text-lead text-ink-muted">
          <Inline nodes={node.content} />
        </blockquote>
      );
    case "list":
      return (
        <ul className="list-outside list-disc space-y-2xs pl-lg">
          {node.items.map((item, index) => (
            <li key={index}>
              <Inline nodes={item} />
            </li>
          ))}
        </ul>
      );
    case "paragraph":
      return (
        <p>
          <Inline nodes={node.content} />
        </p>
      );
  }
}

export function RichText({ body, className }: { body: string; className?: string }) {
  const blocks = parseRichText(body);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn("max-w-measure space-y-md text-body", className)}>
      {blocks.map((block, index) => (
        <Block key={index} node={block} />
      ))}
    </div>
  );
}
