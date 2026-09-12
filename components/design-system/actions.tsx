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
  "inline-flex min-h-touch items-center justify-center rounded-pill bg-forest px-lg py-sm font-ui text-subheading font-medium text-paper transition-colors duration-fast ease-editorial hover:bg-forest-strong";

const SECONDARY =
  "inline-flex min-h-touch items-center justify-center rounded-pill border border-forest px-lg py-sm font-ui text-subheading text-forest transition-colors duration-fast ease-editorial hover:bg-forest hover:text-paper";

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
  ...rest
}: {
  href: ComponentProps<typeof Link>["href"];
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={cn(SECONDARY, className)} {...rest}>
      {children}
    </Link>
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
