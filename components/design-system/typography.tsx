import type { ReactNode } from "react";

import { cn } from "./cn";
import { formatLongDate } from "./dates";
import { intlLocale, type Locale } from "@/src/i18n/locale";

/**
 * Tipografía del sistema. Los tamaños vienen de los tokens de `ux.md`; ningún
 * componente escribe un tamaño arbitrario.
 *
 * Desde ADR-024 el reparto de familias tiene un criterio y no una costumbre: la
 * grotesca (`font-display`, `font-ui`) es la voz **del sitio** —títulos, etiquetas,
 * cifras, navegación—, y la serif (`font-prose`) es la voz **de quien habla**: la
 * prosa, las bajadas y la cita de la familia. Por eso `Testimony` es el único
 * componente de este archivo que se queda en serif a escala de título: es la única
 * frase del sitio que no la escribimos nosotros.
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
 * Título de sección con su regla, y —sólo si hace falta— una sobrelínea.
 *
 * **`label` casi nunca corresponde.** Se usaba en las treinta y nueve secciones del
 * sitio y en ninguna decía algo que el título no dijera: «LA OBRA» arriba de «Qué
 * hay que reconstruir», «EL AVANCE» arriba de «Cómo va». Una etiqueta que sólo
 * anuncia el título es chrome, y es uno de los delatores de página generada que
 * enumera la skill `frontend-design` (ADR-021). La etiqueta se pone cuando
 * transporta información que el título no tiene —un estado, una fecha, un país— y en
 * ese caso va en la voz de interfaz, sin versales.
 *
 * La etiqueta **no** es un encabezado: es una sobrelínea. Si fuera un `h3`
 * dentro de un `h2` rompería la jerarquía, que es una de las cosas que axe
 * detecta y que un lector de pantalla sufre.
 *
 * **La regla es sólo del `h2`.** La regla de un pixel es el recurso con el que este
 * sitio reemplaza a las cards, y lo que significa es «acá empieza una sección». Un
 * `h3` es una parte de la sección que ya empezó: dibujarle la misma regla convierte
 * el separador en decoración, y en la única sección que tiene subtítulo dejaba tres
 * filetes en ciento veinte píxeles —el último rubro del presupuesto, el subtítulo y
 * la barra de progreso—.
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
    <div className={cn(level === 2 ? "mb-xl" : "mb-lg", className)}>
      {label === undefined ? null : (
        <p className="mb-sm font-ui text-small text-ink-muted">{label}</p>
      )}
      <Heading
        {...(id === undefined ? {} : { id })}
        className={cn(
          "font-display",
          level === 2 ? "text-heading" : "text-subheading font-medium",
        )}
      >
        {title}
      </Heading>
      {level === 2 ? <hr className="mt-md border-t border-rule" /> : null}
    </div>
  );
}

/**
 * La frase de la familia, atribuida.
 *
 * Es el **único** momento del sitio que sube a escala de título, y es deliberado.
 * La jerarquía tipográfica estaba en los tokens y no se usaba: todos los `h2` del
 * sitio tenían el mismo tamaño y la escala de display se gastaba una sola vez, en
 * el nombre del proyecto. Un documento donde nada es más grande que lo demás no
 * tiene jerarquía, tiene un promedio (ADR-021).
 *
 * Va con `<blockquote>` y `<cite>` reales, no con comillas decorativas y un `div`:
 * la atribución es parte del significado. Y va sin comillas tipográficas dibujadas
 * a mano —esas comillas gigantes de apertura son ornamento— porque la cita ya se
 * distingue por escala, por sangría y por la regla del margen.
 */
export function Testimony({
  quote,
  author,
  relation,
  className,
}: {
  quote: string;
  author: string;
  relation: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      {/* La medida va acá y no en el `figure`: el token está en `em` para escalar con
          el tamaño de la cita, y `em` resuelve contra el `font-size` del **propio**
          elemento. Puesto en el `figure`, que hereda el cuerpo de 17 px, 20em daban
          340 px y la cita salía en seis líneas de tres palabras. */}
      <blockquote className="max-w-quote border-l-2 border-aqua pl-lg font-prose text-title">
        {quote}
      </blockquote>
      {/* La atribución no se atenúa con color: la jerarquía la hace el tamaño, y así
          el componente sirve igual sobre papel y sobre la banda oscura, donde
          `ink-muted` no se leería. */}
      <figcaption className="mt-lg pl-lg font-ui text-small">
        <cite className="not-italic">{author}</cite>
        <span className="block">{relation}</span>
      </figcaption>
    </figure>
  );
}

/** Autoría y fecha. `<time>` real para que la fecha sea legible por máquinas. */
export function Byline({
  isoDate,
  label,
  locale = "es",
  className,
}: {
  isoDate: string;
  label?: string;
  locale?: Locale;
  className?: string;
}) {
  const formatted = formatLongDate(isoDate, intlLocale(locale));

  return (
    <p className={cn("font-ui text-small text-ink-muted", className)}>
      {label === undefined ? null : `${label} `}
      <time dateTime={isoDate}>{formatted}</time>
    </p>
  );
}
