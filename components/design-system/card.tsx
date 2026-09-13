import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";
import type { Photograph } from "./photo";

/**
 * Vista previa de otra página, como tarjeta.
 *
 * Una vista previa es una puerta: tiene que verse **dónde empieza y dónde
 * termina**, y tiene que ser evidente que toda ella lleva a algún lado. Antes las
 * previas del sitio eran prosa suelta con un enlace subrayado al final, y se
 * confundían con el texto que las rodeaba. Ésta es la única tarjeta del sistema
 * con enlace: borde de regla, fondo propio, foto recortada a una proporción fija
 * para que una fila de tarjetas quede pareja, y una línea de acción al pie que
 * dice a dónde va.
 *
 * Sin sombra: el borde y el cambio de superficie alcanzan para delimitarla, y la
 * sombra difusa es el rasgo que vuelve a cualquier tarjeta un kit de SaaS.
 *
 * El título es un encabezado real —`h2` en un índice, `h3` dentro de una
 * sección— porque una lista de tarjetas es una lista de entradas, y así se
 * navega con un lector de pantalla.
 */
export function PreviewCard({
  href,
  title,
  eyebrow,
  summary,
  action,
  media,
  sizes = "(min-width: 64rem) 30vw, (min-width: 40rem) 50vw, 100vw",
  as: Heading = "h3",
  lang,
  className,
  children,
}: {
  href: ComponentProps<typeof Link>["href"];
  title: string;
  eyebrow?: ReactNode;
  summary?: string;
  action: string;
  media?: Photograph | null;
  sizes?: string;
  as?: "h2" | "h3";
  lang?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "lift-hover group flex min-w-0 flex-col overflow-hidden rounded-md border border-rule bg-paper text-ink transition-colors duration-fast hover:border-forest",
        className,
      )}
    >
      {media === undefined || media === null ? null : (
        <div className="aspect-card w-full overflow-hidden border-b border-rule bg-paper-sunk">
          <Image
            src={media.url}
            alt={media.alt}
            width={media.width}
            height={media.height}
            sizes={sizes}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div
        className="flex flex-1 flex-col p-lg"
        {...(lang === undefined ? {} : { lang })}
      >
        {eyebrow === undefined ? null : (
          <div className="font-ui text-small text-ink-muted">{eyebrow}</div>
        )}
        <Heading
          className={cn("font-display text-card", eyebrow === undefined ? "" : "mt-xs")}
        >
          {title}
        </Heading>
        {summary === undefined ? null : (
          <p className="mt-sm max-w-measure text-small text-ink-muted">{summary}</p>
        )}
        {children}
        <p className="mt-auto pt-lg font-ui text-small font-medium text-forest">
          {action} →
        </p>
      </div>
    </Link>
  );
}
