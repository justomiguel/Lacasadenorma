import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";
import type { Photograph, PhotoRatio } from "./photo";

const CROP_CLASS: Record<PhotoRatio, string> = {
  portrait: "aspect-portrait",
  landscape: "aspect-landscape",
  wide: "aspect-wide",
  square: "aspect-square",
  card: "aspect-card",
};

/**
 * Vista previa de otra página, como tarjeta.
 *
 * Una vista previa es una puerta: se ve dónde empieza y dónde termina, y toda
 * ella lleva a un solo lugar. El título es un encabezado real porque una lista
 * de tarjetas es una lista de entradas.
 *
 * Si hay foto, va recortada a una proporción fija para que una fila quede
 * pareja. Si no hay —una novedad sin imagen, una página que todavía no eligió
 * retrato— el hueco se reserva: no se pone stock ni una ilustración. Sin sombra:
 * el borde y el cambio de superficie alcanzan. `data-tone="paper"` aísla la
 * tinta: sobre una banda bosque, sin eso `text-ink` se volvía beige sobre beige.
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
  /** `split` pone la foto al lado del texto en escritorio: la previa de Norma. */
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
      data-tone="paper"
      className={cn(
        "lift-hover group flex min-w-0 overflow-hidden rounded-md border border-rule bg-paper text-ink transition-colors duration-fast hover:border-forest",
        split ? "flex-col lg:flex-row" : "flex-col",
        className,
      )}
    >
      {photo === null ? (
        <div
          className={cn(
            "w-full bg-paper-sunk",
            split
              ? "aspect-landscape lg:aspect-portrait lg:w-5/12 lg:shrink-0"
              : CROP_CLASS[crop],
          )}
          aria-hidden="true"
        />
      ) : (
        <div
          className={cn(
            "relative overflow-hidden bg-paper-sunk",
            split
              ? "aspect-landscape w-full lg:aspect-portrait lg:w-5/12 lg:shrink-0"
              : cn("w-full border-b border-rule", CROP_CLASS[crop]),
          )}
        >
          <Image
            src={photo.url}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes={sizes}
            quality={80}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div
        className="flex flex-1 flex-col p-lg lg:p-xl"
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
