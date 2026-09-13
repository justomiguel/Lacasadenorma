import type { ReactNode } from "react";

import { Band, Container } from "./layout";
import { cn } from "./cn";

/**
 * El capítulo como unidad visible.
 *
 * La home cuenta una historia en cinco movimientos, y el problema que tenía no
 * era el relato sino que **no se veía dónde terminaba un movimiento y empezaba
 * el siguiente**: cinco secciones sobre el mismo beige, separadas sólo por aire,
 * con una etiqueta en versales de 12 px como única marca. Este componente hace
 * que cada capítulo abra igual: una regla de borde a borde, el numeral grande en
 * la serif de display, el nombre del capítulo en la voz de interfaz y el título.
 *
 * El numeral está justificado porque el contenido **es** una secuencia —pérdida,
 * comunidad, ayuda, Norma, lo que viene— y el mismo numeral aparece en el índice
 * de capítulos bajo la apertura, así que sirve para orientarse, no para decorar.
 *
 * Va en color de acento (`text-aqua`): sobre papel es el verde bosque y dentro
 * de una banda oscura `data-tone` lo convierte en sage, así que el componente no
 * necesita saber sobre qué fondo está.
 */

/** «01. Lo que pasó» → número y nombre por separado; sin número, sólo el nombre. */
export function splitChapter(label: string): { number: string | null; name: string } {
  const match = /^(\d{1,2})\.\s*(.+)$/s.exec(label.trim());

  if (match === null) {
    return { number: null, name: label.trim() };
  }

  return { number: match[1] ?? null, name: (match[2] ?? "").trim() };
}

export function ChapterHeading({
  label,
  number,
  title,
  id,
  lead,
  size = "title",
  rule = false,
  className,
}: {
  /** La etiqueta del contenido, con o sin numeral: «01. Lo que pasó» o «Norma». */
  label: string;
  /** Numeral explícito, cuando la etiqueta no lo trae. */
  number?: string;
  title: string;
  id: string;
  lead?: string;
  size?: "title" | "display";
  rule?: boolean;
  className?: string;
}) {
  const parsed = splitChapter(label);
  const numeral = number ?? parsed.number;

  return (
    <div className={cn(rule ? "border-t border-rule pt-lg lg:pt-xl" : "", className)}>
      <p
        data-kicker=""
        className="flex items-baseline gap-md font-ui text-small font-medium text-ink-muted"
      >
        {numeral === null ? null : (
          <span aria-hidden="true" className="font-display text-chapter text-aqua">
            {numeral}
          </span>
        )}
        <span>{parsed.name}</span>
      </p>
      <h2
        id={id}
        className={cn(
          "mt-md whitespace-pre-line font-display",
          size === "display" ? "text-display" : "text-title",
        )}
      >
        {title}
      </h2>
      {lead === undefined ? null : (
        <p className="mt-lg max-w-measure text-lead text-ink-muted">{lead}</p>
      )}
    </div>
  );
}

/**
 * Cierre de capítulo: la única acción con la que termina cada movimiento.
 *
 * Antes cada capítulo cerraba con algo distinto —un enlace subrayado chico, un
 * botón, nada—, y no había forma de saber cuál era «el paso siguiente». Ahora
 * todos cierran con la misma pieza: un espacio, y adentro una acción secundaria.
 */
export function ChapterEnd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-xl flex flex-wrap items-center gap-md lg:mt-2xl", className)}>
      {children}
    </div>
  );
}

export interface ChapterLink {
  readonly fragment: string;
  readonly label: string;
}

/**
 * Índice de capítulos, debajo de la apertura.
 *
 * Es el sumario de una publicación: dice de una vez cuántos movimientos tiene
 * la página y cómo se llaman, y cada uno lleva a su ancla. En teléfono se
 * desplaza en horizontal en lugar de apilarse, para que siga siendo un índice y
 * no otra lista. Va sobre una banda hundida con sus reglas: además de orientar,
 * es el corte visible entre la foto de la apertura y el relato.
 */
export function ChapterNav({
  chapters,
  label,
}: {
  chapters: readonly ChapterLink[];
  label: string;
}) {
  return (
    <Band tone="sunk">
      <Container as="nav" aria-label={label}>
        <ol className="-mx-5 flex gap-lg overflow-x-auto px-5 py-xs sm:mx-0 sm:px-0 lg:gap-2xl">
          {chapters.map((chapter) => {
            const parsed = splitChapter(chapter.label);

            return (
              <li key={chapter.fragment} className="shrink-0">
                <a
                  href={`#${chapter.fragment}`}
                  className="inline-flex min-h-touch items-baseline gap-xs font-ui text-small text-ink-muted transition-colors duration-fast hover:text-ink"
                >
                  {parsed.number === null ? null : (
                    <span
                      aria-hidden="true"
                      className="font-display text-body text-forest"
                    >
                      {parsed.number}
                    </span>
                  )}
                  <span>{parsed.name}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </Container>
    </Band>
  );
}
