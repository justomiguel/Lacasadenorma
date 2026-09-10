import type { ReactNode } from "react";

import { cn } from "./cn";
import { formatLongDate } from "./dates";

/**
 * Tipografía del sistema. Los tamaños vienen de los tokens de `ux.md`; ningún
 * componente escribe un tamaño arbitrario.
 */

/** Prosa larga con medida y ritmo vertical. */
export function Prose({
  children,
  className,
  size = "body",
}: {
  children: ReactNode;
  className?: string;
  size?: "body" | "lead";
}) {
  return (
    <div
      className={cn(
        "max-w-measure space-y-md",
        size === "lead" ? "text-lead text-ink-muted" : "text-body",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Párrafos a partir de una lista de textos. Cada elemento es un `<p>`. */
export function Paragraphs({
  items,
  className,
  size = "body",
}: {
  items: readonly string[];
  className?: string;
  size?: "body" | "lead";
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Prose {...(className === undefined ? {} : { className })} size={size}>
      {items.map((text) => (
        <p key={text.slice(0, 48)}>{text}</p>
      ))}
    </Prose>
  );
}

/**
 * Etiqueta en mayúsculas + título + regla.
 *
 * La etiqueta **no** es un encabezado: es una sobrelínea. Si fuera un `h3`
 * dentro de un `h2` rompería la jerarquía, que es una de las cosas que axe
 * detecta y que un lector de pantalla sufre.
 */
export function SectionHeading({
  label,
  title,
  id,
  level = 2,
  className,
}: {
  label?: string;
  title: string;
  id?: string;
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <div className={cn("mb-xl", className)}>
      {label === undefined ? null : (
        <p className="mb-sm font-ui text-label uppercase text-ink-muted">{label}</p>
      )}
      <Heading
        {...(id === undefined ? {} : { id })}
        className={cn(
          "font-prose",
          level === 2 ? "text-heading" : "text-subheading font-medium",
        )}
      >
        {title}
      </Heading>
      <hr className="mt-md border-t border-rule" />
    </div>
  );
}

/** Autoría y fecha. `<time>` real para que la fecha sea legible por máquinas. */
export function Byline({
  isoDate,
  label,
  className,
}: {
  isoDate: string;
  label?: string;
  className?: string;
}) {
  const formatted = formatLongDate(isoDate);

  return (
    <p className={cn("font-ui text-small text-ink-muted", className)}>
      {label === undefined ? null : `${label} `}
      <time dateTime={isoDate}>{formatted}</time>
    </p>
  );
}
