import Image from "next/image";

import { cn } from "@/components/design-system/cn";
import { SectionHeading } from "@/components/design-system/typography";
import type { PressItem } from "@/content/schema";

/**
 * Recortes de prensa: miniatura, medio y nuestro título.
 *
 * El título es el enlace, y es único: un "leer más" repetido no deja elegir
 * entre quince notas. Los títulos los escribe el contenido, no este
 * componente, para no copiar una crónica que nombra mal el lugar o el
 * apellido.
 */
export function PressClippings({
  items,
  heading,
  lead,
  contextHeading,
  headingId,
}: {
  items: readonly PressItem[];
  heading: string;
  lead: string;
  contextHeading: string;
  headingId: string;
}) {
  if (items.length === 0) {
    return null;
  }

  const memorial = items.filter((item) => item.kind === "memorial");
  const coverage = items.filter((item) => item.kind === "coverage");
  const context = items.filter((item) => item.kind === "context");

  return (
    <>
      <SectionHeading title={heading} id={headingId} />
      <p className="mt-md max-w-measure text-body text-ink-muted">{lead}</p>

      {memorial.length === 0 ? null : (
        <div className="mt-2xl space-y-lg">
          {memorial.map((item) => (
            <Clipping key={item.url} item={item} featured headingLevel="h3" />
          ))}
        </div>
      )}

      {coverage.length === 0 ? null : (
        <div className="mt-2xl grid md:grid-cols-2 md:gap-lg lg:grid-cols-3">
          {coverage.map((item) => (
            <Clipping key={item.url} item={item} headingLevel="h3" />
          ))}
        </div>
      )}

      {context.length === 0 ? null : (
        <div className="mt-3xl">
          <h3 className="font-display text-subheading font-medium">{contextHeading}</h3>
          <div className="mt-lg grid md:grid-cols-2 md:gap-lg lg:grid-cols-3">
            {context.map((item) => (
              <Clipping key={item.url} item={item} headingLevel="h4" />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Clipping({
  item,
  featured = false,
  headingLevel,
}: {
  item: PressItem;
  featured?: boolean;
  headingLevel: "h3" | "h4";
}) {
  const Heading = headingLevel;

  return (
    <article
      className={cn(
        "border-b border-rule py-xl md:overflow-hidden md:rounded-md md:border md:border-rule md:bg-paper md:py-0 md:shadow-card",
      )}
    >
      {item.image === null ? null : (
        <div
          className={cn(
            "relative overflow-hidden",
            featured ? "aspect-[16/9]" : "aspect-[4/3]",
          )}
        >
          <Image
            src={item.image.url}
            alt={item.image.alt}
            width={item.image.width}
            height={item.image.height}
            sizes={
              featured
                ? "(min-width: 64rem) 48rem, 100vw"
                : "(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"
            }
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="md:p-lg">
        <p className="font-ui text-label text-olive">{item.source}</p>
        <Heading className="mt-xs font-display text-subheading font-medium">
          <a
            href={item.url}
            rel="noopener noreferrer"
            target="_blank"
            className="text-forest underline decoration-1 underline-offset-2 transition-colors duration-fast hover:text-forest-strong"
          >
            {item.title}
          </a>
        </Heading>
      </div>
    </article>
  );
}
