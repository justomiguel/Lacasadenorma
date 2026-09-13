import type { ReactNode } from "react";

import { cn } from "@/components/design-system/cn";
import { Band, Container } from "@/components/design-system/layout";

/**
 * Un momento del relato (ADR-032).
 *
 * La home no es una lista de secciones: es una secuencia —incendio, comunidad,
 * ayuda, Norma, lo que viene— y cada momento abre igual: el numeral chico, la
 * sobrelínea en versales y el titular grande. La separación entre momentos la hace
 * el aire (80 px en teléfono, 120 en escritorio) y el cambio de superficie, no una
 * caja.
 *
 * El numeral existe porque el contenido **es** una secuencia; por eso es chico y
 * va en la voz de interfaz, no como un adorno de display.
 */

/** «01. Lo que pasó» → número y nombre por separado; sin número, sólo el nombre. */
export function splitChapter(label: string): { number: string | null; name: string } {
  const match = /^(\d{1,2})\.\s*(.+)$/s.exec(label.trim());

  if (match === null) {
    return { number: null, name: label.trim() };
  }

  return { number: match[1] ?? null, name: (match[2] ?? "").trim() };
}

export function StoryHeading({
  label,
  number,
  title,
  id,
  lead,
  size = "headline",
  className,
}: {
  /** La etiqueta del contenido, con o sin numeral: «01. Lo que pasó» o «Norma». */
  label: string;
  /** Numeral explícito, cuando la etiqueta no lo trae. */
  number?: string;
  title: string;
  id: string;
  lead?: string;
  size?: "headline" | "display";
  className?: string;
}) {
  const parsed = splitChapter(label);
  const numeral = number ?? parsed.number;

  return (
    <div className={className} data-reveal="">
      <p
        data-kicker=""
        className="flex items-baseline gap-md font-ui text-eyebrow font-medium uppercase text-ink-muted"
      >
        {numeral === null ? null : (
          <span aria-hidden="true" className="tabular-nums">
            {numeral}
          </span>
        )}
        <span>{parsed.name}</span>
      </p>
      <h2
        id={id}
        className={cn(
          "mt-lg whitespace-pre-line font-display",
          size === "display" ? "text-display" : "text-headline",
        )}
      >
        {title}
      </h2>
      {lead === undefined ? null : (
        <p className="mt-lg max-w-measure text-body-large text-ink-muted">{lead}</p>
      )}
    </div>
  );
}

export function StorySection({
  id,
  labelledBy,
  chapter,
  tone = "paper",
  children,
  className,
}: {
  id?: string;
  labelledBy: string;
  chapter: string;
  tone?: "paper" | "sunk" | "forest" | "ink";
  children: ReactNode;
  className?: string;
}) {
  const section = (
    <section
      {...(id === undefined ? {} : { id })}
      aria-labelledby={labelledBy}
      data-chapter={chapter}
      className={cn("scroll-mt-3xl py-4xl lg:py-6xl", className)}
    >
      <Container>{children}</Container>
    </section>
  );

  if (tone === "paper") {
    return section;
  }

  return <Band tone={tone}>{section}</Band>;
}
