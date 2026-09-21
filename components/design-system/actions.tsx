import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";
import { IdentifyingMark } from "./identifying-mark";
import { ArrowIcon, BookIcon, HandsIcon } from "./icons";

/** Marca de «Ayudar a reconstruir»: manos antes del nombre (ADR-047). */
export function HelpActionLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <IdentifyingMark>
        <HandsIcon />
      </IdentifyingMark>
      {children}
    </>
  );
}

/**
 * Tres familias de acción, y ninguna más (ADR-032).
 *
 * - **Primaria**: rectangular, radio medio, 56 px de alto en teléfono, todo el
 *   ancho. Hay una por pantalla y dice «Ayudar a reconstruir». Lleva
 *   pictograma identificador **antes** del nombre (ADR-047).
 * - **Secundaria**: texto y flecha. Sin caja, sin fondo, sin borde. La flecha se
 *   mueve 3 px al pasar el puntero y nada más.
 * - **Utilitaria**: un icono de 44 px para copiar, cerrar, abrir el menú.
 *
 * Los objetivos táctiles llegan a 44 px por tamaño mínimo, no por padding visual.
 */

const PRIMARY_BASE =
  "inline-flex min-h-cta w-full items-center justify-center gap-xs rounded-md px-lg font-ui text-body font-medium transition-colors duration-fast ease-editorial active:translate-y-px sm:min-h-12 sm:w-auto sm:px-xl";

const PRIMARY_TONE = {
  forest: "bg-forest text-paper hover:bg-forest-strong active:bg-forest-strong",
  paper: "isolate bg-paper text-forest hover:bg-paper-sunk active:bg-paper-muted",
} as const;

export type ActionTone = keyof typeof PRIMARY_TONE;

export function primaryActionClass(tone: ActionTone = "forest", className?: string) {
  return cn(PRIMARY_BASE, PRIMARY_TONE[tone], className);
}

/**
 * Primaria que cabe en el encabezado de 60 px. Misma familia, mismo contraste:
 * no es texto del chrome. `cn` no resuelve conflictos, así que el alto no
 * puede ser un override de `PRIMARY_BASE`.
 */
const COMPACT_BASE =
  "inline-flex min-h-touch w-auto shrink-0 items-center justify-center gap-xs whitespace-nowrap rounded-md px-md font-ui text-small font-medium transition-colors duration-fast ease-editorial active:translate-y-px";

export function compactPrimaryActionClass(
  tone: ActionTone = "forest",
  className?: string,
) {
  return cn(COMPACT_BASE, PRIMARY_TONE[tone], className);
}

/**
 * Misma geometría que la primaria compacta, sin relleno: el chrome puede
 * tener un segundo control con caja (Ingresar) sin que haya dos primarias.
 */
export function compactOutlineActionClass(
  tone: ActionTone = "forest",
  className?: string,
) {
  return cn(
    COMPACT_BASE,
    "border",
    tone === "paper"
      ? "border-paper text-paper hover:bg-forest-strong/40"
      : "border-forest text-forest hover:bg-paper-sunk",
    className,
  );
}

const SECONDARY_BASE =
  "arrow-link inline-flex min-h-touch items-center gap-xs font-ui text-body font-medium transition-colors duration-fast ease-editorial";

const SECONDARY_TONE = {
  forest: "text-forest hover:text-forest-strong",
  paper: "text-paper hover:text-sage",
} as const;

export function secondaryActionClass(tone: ActionTone = "forest", className?: string) {
  return cn(SECONDARY_BASE, SECONDARY_TONE[tone], className);
}

/** Icono de 44 px, sin fondo. Para copiar, cerrar, compartir. */
export const ICON_ACTION =
  "inline-flex size-touch shrink-0 items-center justify-center rounded-sm transition-colors duration-fast ease-editorial hover:bg-paper-sunk active:bg-paper-muted";

export function PrimaryAction({
  href,
  icon,
  children,
  className,
  tone = "forest",
  ...rest
}: {
  href: ComponentProps<typeof Link>["href"];
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: ActionTone;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={primaryActionClass(tone, className)}
      {...(tone === "paper" ? { "data-tone": "paper" as const } : {})}
      {...rest}
    >
      <IdentifyingMark>{icon}</IdentifyingMark>
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
  tone?: ActionTone;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={secondaryActionClass(tone, className)} {...rest}>
      <span>{children}</span>
      <ArrowIcon />
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
      className={
        isDownload
          ? secondaryActionClass("forest", className)
          : primaryActionClass("forest", className)
      }
      {...(isDownload
        ? { download: download === true ? true : download }
        : { target: "_blank", rel: "noopener noreferrer" })}
    >
      {isDownload ? (
        <>
          <span>{children}</span>
          <ArrowIcon />
        </>
      ) : (
        <>
          <IdentifyingMark>
            <BookIcon />
          </IdentifyingMark>
          {children}
        </>
      )}
    </a>
  );
}

/**
 * Acción hacia otra parte de **esta** página.
 *
 * Es un `<a>` y no un `Link`: con `typedRoutes` una URL que es sólo un fragmento no
 * es una ruta del sitio. El navegador ya sabe desplazarse a un `id`, así que no
 * hace falta JavaScript. Es del rango de la secundaria: texto y flecha.
 */
export function InPageAction({
  fragment,
  children,
  className,
  tone = "forest",
}: {
  /** El `id` del destino, sin `#`. */
  fragment: string;
  children: ReactNode;
  className?: string;
  tone?: ActionTone;
}) {
  return (
    <a href={`#${fragment}`} className={secondaryActionClass(tone, className)}>
      <span>{children}</span>
      <ArrowIcon />
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
