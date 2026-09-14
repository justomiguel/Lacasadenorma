import type { ReactNode } from "react";

import { isPhoto, isVideo, type MediaAsset } from "@/src/domain/entities";
import { parseRichText, type BlockNode, type InlineNode } from "@/src/domain/rich-text";

import { InlineLink } from "./actions";
import { cn } from "./cn";
import { Figure } from "./photo";

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
      return node.href.startsWith("http") ? (
        <InlineLink href={node.href} rel="noopener noreferrer" target="_blank">
          {node.value}
        </InlineLink>
      ) : (
        <InlineLink href={node.href}>{node.value}</InlineLink>
      );
  }
}

function MediaBlock({
  node,
  byId,
}: {
  node: Extract<BlockNode, { kind: "figure" } | { kind: "video" }>;
  byId: ReadonlyMap<string, MediaAsset>;
}) {
  const asset = byId.get(node.mediaId);

  if (asset === undefined) {
    return null;
  }

  if (node.kind === "figure" && isPhoto(asset)) {
    return (
      <Figure
        media={asset}
        reservedFor=""
        sizes="(min-width: 48rem) 40rem, 100vw"
        className="max-w-measure"
      />
    );
  }

  if (node.kind === "video" && isVideo(asset)) {
    const type = asset.url.endsWith(".webm") ? "video/webm" : "video/mp4";

    return (
      <figure className="max-w-measure">
        <video
          controls
          preload="metadata"
          width={asset.width}
          height={asset.height}
          className="aspect-wide w-full bg-paper-sunk"
          aria-label={node.alt}
        >
          <source src={asset.url} type={type} />
        </video>
        {asset.caption === null ? null : (
          <figcaption className="mt-xs font-ui text-caption text-ink-muted">
            {asset.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return null;
}

function Block({
  node,
  byId,
}: {
  node: BlockNode;
  byId: ReadonlyMap<string, MediaAsset>;
}): ReactNode {
  switch (node.kind) {
    case "heading":
      return (
        <h3 className="mt-xl font-display text-subheading font-medium first:mt-0">
          <Inline nodes={node.content} />
        </h3>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-aqua pl-lg text-lead text-ink-muted">
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
    case "figure":
    case "video":
      return <MediaBlock node={node} byId={byId} />;
  }
}

export function RichText({
  body,
  media = [],
  className,
}: {
  body: string;
  media?: readonly MediaAsset[];
  className?: string;
}) {
  const blocks = parseRichText(body);

  if (blocks.length === 0) {
    return null;
  }

  const byId = new Map(media.map((item) => [item.id, item]));

  return (
    <div className={cn("max-w-measure space-y-md text-body", className)}>
      {blocks.map((block, index) => (
        <Block key={index} node={block} byId={byId} />
      ))}
    </div>
  );
}
