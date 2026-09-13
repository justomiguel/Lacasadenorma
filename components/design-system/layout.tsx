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

/**
 * Margen lateral y ancho máximo de página. 20 px en mobile, hasta 96 px en desktop.
 *
 * Acepta `aria-label` porque sin eso un `nav` o una `section` construidos con esta
 * primitiva **no pueden tener nombre**. Y la falla es silenciosa de la peor manera:
 * el atributo se escribe en el llamado, TypeScript no se queja de una propiedad de
 * más, y el elemento sale al HTML sin nombre accesible. Pasó con el sumario del
 * sitio, y lo detectó un test de navegación que encontró el pie en su lugar.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "header" | "footer" | "section" | "article" | "nav" | "main";
  "aria-label"?: string;
}) {
  return (
    <Tag
      {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
      className={cn("mx-auto w-full max-w-page px-5 sm:px-xl lg:px-4xl", className)}
    >
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
  chapter,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  tight?: boolean;
  chapter?: string;
}) {
  return (
    <section
      {...(id === undefined ? {} : { id })}
      {...(labelledBy === undefined ? {} : { "aria-labelledby": labelledBy })}
      {...(chapter === undefined ? {} : { "data-chapter": chapter })}
      className={cn(tight ? "py-2xl lg:py-3xl" : "py-3xl lg:py-4xl", className)}
    >
      {children}
    </section>
  );
}

/**
 * Banda de superficie: una sección entera sobre otro fondo, de borde a borde.
 *
 * Es uno de los tres recursos con los que el documento deja de ser un solo plano
 * (ADR-021). Estuvo prometido en `ux.md` §4 desde el principio y tuvo **cero** uso
 * en páginas públicas, y eso —junto con la ausencia de fotos— es lo que hacía que
 * once páginas se vieran iguales.
 *
 * `ink` es deliberadamente escasa: **una sola sección en todo el sitio**, la de qué
 * ocurrió. El tono oscuro ahí no es un efecto, es lo único que la separa del resto
 * del documento, y usarlo dos veces lo convierte en decoración.
 *
 * El fondo y el `data-tone` van en **elementos distintos**, y no es un descuido: de
 * `data-tone="ink"` cuelga la inversión de la paleta de `globals.css`, que redefine
 * `--color-ink` y compañía para lo que esté adentro. Si el mismo elemento llevara
 * `bg-ink`, su propio fondo se volvería papel.
 */
export function Band({
  children,
  tone,
  className,
}: {
  children: ReactNode;
  tone: "sunk" | "ink" | "forest";
  className?: string;
}) {
  return (
    <div
      className={cn(
        tone === "ink"
          ? "bg-ink text-paper"
          : tone === "forest"
            ? "bg-forest text-paper"
            : "bg-paper-sunk",
        tone === "sunk" ? "border-y border-rule" : "",
        className,
      )}
    >
      {tone === "sunk" ? children : <div data-tone={tone}>{children}</div>}
    </div>
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
