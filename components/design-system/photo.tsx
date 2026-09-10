import Image from "next/image";

import type { MediaAsset } from "@/src/domain/entities";

import { cn } from "./cn";

/**
 * Fotografía y espacio reservado.
 *
 * La fotografía es el elemento con más peso del sitio, y hoy es el que falta.
 * Mientras no haya fotos reales **no se usan ilustraciones, ni imágenes de stock,
 * ni imágenes generadas**: se reserva el espacio con la proporción correcta y se
 * dice qué va ahí. Un espacio vacío con intención se lee como respeto; una foto
 * de stock se lee como mentira.
 *
 * Las fotos no llevan radio: van a escuadra, como en un impreso.
 */

export type PhotoRatio = "portrait" | "landscape" | "wide";

const RATIO_VALUE: Record<PhotoRatio, string> = {
  portrait: "3 / 4",
  landscape: "4 / 3",
  wide: "16 / 9",
};

export function Figure({
  media,
  ratio = "landscape",
  priority = false,
  sizes = "100vw",
  reservedFor,
  className,
}: {
  media: MediaAsset | null;
  ratio?: PhotoRatio;
  priority?: boolean;
  sizes?: string;
  /** Qué foto va acá, para cuando todavía no existe. */
  reservedFor: string;
  className?: string;
}) {
  if (media === null) {
    return (
      <figure className={className}>
        <ReservedSpace ratio={ratio} description={reservedFor} />
      </figure>
    );
  }

  return (
    <figure className={className}>
      <Image
        src={media.url}
        alt={media.alt}
        width={media.width}
        height={media.height}
        sizes={sizes}
        priority={priority}
        className="w-full"
      />
      {media.caption === null && media.credit === null ? null : (
        <figcaption className="mt-sm max-w-measure font-ui text-small text-ink-muted">
          {media.caption}
          {media.credit === null ? null : (
            <span className="block text-ink-faint">Foto: {media.credit}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * El hueco de una foto que todavía no existe, con su proporción real para que no
 * haya salto de layout cuando la foto llegue.
 */
export function ReservedSpace({
  ratio = "landscape",
  description,
  className,
}: {
  ratio?: PhotoRatio;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full items-end border border-rule bg-paper-sunk p-md",
        className,
      )}
      style={{ aspectRatio: RATIO_VALUE[ratio] }}
    >
      {/*
        Sin `uppercase`: esto es una oración, no una etiqueta. En versales, dos o
        tres líneas de texto corrido se leen bastante peor, y acá la oración es lo
        que explica que el hueco es una espera y no un error.
      */}
      <p className="max-w-measure font-ui text-small text-ink-muted">{description}</p>
    </div>
  );
}

/**
 * Serie de fotos. Devuelve `null` cuando no hay ninguna: una galería vacía no es
 * una galería, y un carrusel de huecos no comunica nada.
 */
export function PhotoEssay({
  media,
  className,
}: {
  media: readonly MediaAsset[];
  className?: string;
}) {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-md sm:grid-cols-2", className)}>
      {media.map((item, index) => (
        <Figure
          key={item.id}
          media={item}
          reservedFor=""
          sizes="(min-width: 40rem) 50vw, 100vw"
          priority={index === 0}
        />
      ))}
    </div>
  );
}
