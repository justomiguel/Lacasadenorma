import type { ReactNode } from "react";

import { cn } from "./cn";

/**
 * Aviso: dato desactualizado, información que falta, cifra no disponible.
 *
 * El color **no** es el único indicador: cada tono lleva su propia palabra en el
 * texto y una regla lateral distinta, porque un aviso que sólo se distingue por
 * color no existe para quien no lo ve (WCAG 1.4.1).
 */

export type CalloutTone = "neutral" | "warning" | "danger";

const TONE_CLASSES: Record<CalloutTone, string> = {
  neutral: "border-l-rule",
  warning: "border-l-warning",
  danger: "border-l-danger",
};

export function Callout({
  children,
  tone = "neutral",
  title,
  className,
}: {
  children: ReactNode;
  tone?: CalloutTone;
  title?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "max-w-measure border-l-2 bg-paper-sunk py-md pl-md pr-md",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {title === undefined ? null : (
        <p className="mb-2xs font-ui text-label text-ink-muted">{title}</p>
      )}
      <div className="text-small text-ink">{children}</div>
    </div>
  );
}

/**
 * Estado vacío. Explica **por qué** está vacío y qué va a pasar. Nunca un cero
 * solo: un cero es una afirmación, y "todavía no hay datos" es otra distinta.
 */
export function EmptyState({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-measure border-t border-rule pt-lg", className)}>
      <p className="font-ui text-subheading text-ink">{title}</p>
      <div className="mt-xs text-body text-ink-muted">{children}</div>
    </div>
  );
}
