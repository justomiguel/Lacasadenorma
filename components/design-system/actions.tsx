import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";

/**
 * Acciones.
 *
 * Hay **una** acción primaria por pantalla. La secundaria es un enlace de texto
 * con regla, no un segundo botón: dos botones compitiendo diluyen la decisión
 * (ux.md §9).
 *
 * Los objetivos táctiles llegan a 44 px por padding, no por tamaño visual.
 */

const PRIMARY =
  "lift-hover inline-flex min-h-touch items-center justify-center whitespace-nowrap rounded-pill bg-forest px-lg py-sm font-ui text-subheading font-medium text-paper hover:bg-forest-strong";

const SECONDARY_BASE =
  "lift-hover inline-flex min-h-touch items-center justify-center whitespace-nowrap rounded-pill border px-lg py-sm font-ui text-subheading";

/**
 * La secundaria tiene dos tonos y no una clase suelta: `cn` no resuelve
 * conflictos de Tailwind, y sumar `border-paper` encima de `border-forest`
 * dejaba el resultado librado al orden de la hoja de estilos.
 */
const SECONDARY_TONE = {
  forest: "border-forest text-forest hover:bg-forest hover:text-paper",
  paper: "border-paper text-paper hover:bg-paper hover:text-forest",
} as const;

const SECONDARY = `${SECONDARY_BASE} ${SECONDARY_TONE.forest}`;

export function PrimaryAction({
  href,
  children,
  className,
  ...rest
}: {
  href: ComponentProps<typeof Link>["href"];
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={cn(PRIMARY, className)} {...rest}>
      {children}
    </Link>
  );
}

export function SecondaryAction({
  href,
  children,
  className,
  tone = "forest",
  ...rest
}: {
  href: ComponentProps<typeof Link>["href"];
  children: ReactNode;
  className?: string;
  /** `paper` es para las bandas oscuras. */
  tone?: keyof typeof SECONDARY_TONE;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={cn(SECONDARY_BASE, SECONDARY_TONE[tone], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * Enlace a un archivo del sitio (el PDF de la obra). No es una ruta de Next:
 * un `Link` tipado no puede apuntar a `/documentos/…`.
 */
export function FileAction({
  href,
  children,
  className,
  download,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Si está, el navegador descarga en lugar de abrir. */
  download?: string | true;
}) {
  const isDownload = download !== undefined;

  return (
    <a
      href={href}
      className={cn(isDownload ? SECONDARY : PRIMARY, className)}
      {...(isDownload
        ? { download: download === true ? true : download }
        : { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </a>
  );
}

/**
 * Acción hacia otra parte de **esta** página.
 *
 * Es un `<a>` y no un `Link`: con `typedRoutes` una URL que es sólo un fragmento no
 * es una ruta del sitio, y forzarla al tipo de `Link` sería mentirle al compilador
 * para no escribir cuatro líneas. El navegador ya sabe desplazarse a un `id`, así
 * que no hace falta JavaScript.
 *
 * Comparte el estilo de la acción secundaria porque es del mismo rango: en la
 * apertura hay una sola cosa con forma de botón (ux.md §9).
 */
export function InPageAction({
  fragment,
  children,
  className,
}: {
  /** El `id` del destino, sin `#`. */
  fragment: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={`#${fragment}`} className={cn(SECONDARY, className)}>
      {children}
    </a>
  );
}

/** Enlace dentro de prosa. Subrayado siempre: el color no alcanza (WCAG 1.4.1). */
export function InlineLink({
  href,
  children,
  className,
  ...rest
}: {
  href: ComponentProps<typeof Link>["href"];
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={cn(
        "text-forest underline decoration-1 underline-offset-2 transition-colors duration-fast hover:text-forest-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
