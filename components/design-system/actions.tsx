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
  "inline-flex min-h-touch items-center justify-center rounded-sm bg-brick px-lg py-sm font-ui text-subheading font-medium text-paper transition-colors duration-fast ease-editorial hover:bg-brick-strong active:translate-y-3xs";

const SECONDARY =
  "inline-flex min-h-touch items-center font-ui text-subheading text-ink underline decoration-brick decoration-2 underline-offset-4 transition-colors duration-fast ease-editorial hover:text-brick-strong";

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
        "text-brick underline decoration-1 underline-offset-2 transition-colors duration-fast hover:text-brick-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
