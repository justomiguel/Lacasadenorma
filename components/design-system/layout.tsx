import type { ReactNode } from "react";

import { cn } from "./cn";

/**
 * Primitivas de composición: la grilla, la medida de lectura y las reglas de un
 * pixel que reemplazan a las cards (ux.md §4).
 *
 * Que las reglas sean un componente y no una clase suelta importa: es lo que
 * hace que el sitio se lea como un impreso, y conviene que sea difícil de
 * olvidar.
 */

/** Margen lateral y ancho máximo de página. 20 px en mobile, hasta 96 px en desktop. */
export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "header" | "footer" | "section" | "article" | "nav" | "main";
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-page px-5 sm:px-xl lg:px-4xl", className)}>
      {children}
    </Tag>
  );
}

/**
 * Bloque de sección con el ritmo vertical editorial. La separación entre bloques
 * hace más por la jerarquía que cualquier borde.
 */
export function Section({
  children,
  className,
  id,
  labelledBy,
  tight = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  tight?: boolean;
}) {
  return (
    <section
      {...(id === undefined ? {} : { id })}
      {...(labelledBy === undefined ? {} : { "aria-labelledby": labelledBy })}
      className={cn(tight ? "py-2xl lg:py-3xl" : "py-4xl lg:py-5xl", className)}
    >
      {children}
    </section>
  );
}

/** Medida de lectura: 68 caracteres. Una línea de 140 no se lee. */
export function Measure({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("max-w-measure", className)}>{children}</div>;
}

/** Regla de un pixel. El recurso que reemplaza a las cards. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn("border-t border-rule", className)} />;
}

/**
 * Composición editorial asimétrica: la prosa en la columna ancha, las notas al
 * margen. Centrar todo es la firma del template.
 */
export function Editorial({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-xl lg:grid-cols-12 lg:gap-lg", className)}>
      <div className="lg:col-span-7 lg:col-start-1">{children}</div>
      {aside === undefined ? null : (
        <div className="lg:col-span-4 lg:col-start-9">{aside}</div>
      )}
    </div>
  );
}
