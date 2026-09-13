import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";
import { ArrowIcon } from "./icons";
import type { Photograph, PhotoRatio } from "./photo";

const CROP_CLASS: Record<PhotoRatio, string> = {
  portrait: "aspect-portrait",
  landscape: "aspect-landscape",
  wide: "aspect-wide",
  square: "aspect-square",
  card: "aspect-card",
};

/**
 * Vista previa de otra página (ADR-032).
 *
 * Ya no es una tarjeta: es la foto, el título y una flecha, y toda ella lleva a
 * un solo lugar. Sin borde, sin fondo propio, sin radio: lo que la delimita es la
 * foto arriba y el aire alrededor. El título es un encabezado real porque una
 * lista de previas es una lista de entradas.
 *
 * Si hay foto, va recortada a una proporción fija para que una fila quede
 * pareja. Si no hay —una novedad sin imagen— el hueco se reserva en papel hundido:
 * no se pone stock ni una ilustración.
 */
export function PreviewCard({
  href,
  title,
  eyebrow,
  summary,
  action,
  media,
  crop = "card",
  layout = "stack",
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
  crop?: PhotoRatio;
  /** `split` pone la foto al lado del texto en escritorio. */
  layout?: "stack" | "split";
  sizes?: string;
  as?: "h2" | "h3";
  lang?: string;
  className?: string;
  children?: ReactNode;
}) {
  const split = layout === "split";
  const photo = media === undefined || media === null ? null : media;

  return (
    <Link
      href={href}
      className={cn(
        "arrow-link group flex min-w-0 gap-md text-ink no-underline",
        split ? "flex-col lg:flex-row lg:gap-xl" : "flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-paper-sunk",
          split
            ? "aspect-landscape w-full lg:aspect-portrait lg:w-5/12 lg:shrink-0"
            : cn("w-full", CROP_CLASS[crop]),
        )}
        {...(photo === null ? { "aria-hidden": true } : {})}
      >
        {photo === null ? null : (
          <Image
            src={photo.url}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes={sizes}
            quality={80}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col" {...(lang === undefined ? {} : { lang })}>
        {eyebrow === undefined ? null : (
          <div className="font-ui text-caption text-ink-muted">{eyebrow}</div>
        )}
        <Heading
          className={cn(
            "font-display text-section-title",
            eyebrow === undefined ? "" : "mt-2xs",
          )}
        >
          {title}
        </Heading>
        {summary === undefined ? null : (
          <p className="mt-xs max-w-measure text-small text-ink-muted">{summary}</p>
        )}
        {children}
        {/* `aqua` es el verde sobre papel y sage sobre una banda oscura. */}
        <p className="mt-auto inline-flex items-center gap-xs pt-md font-ui text-small font-medium text-aqua">
          <span>{action}</span>
          <ArrowIcon />
        </p>
      </div>
    </Link>
  );
}
