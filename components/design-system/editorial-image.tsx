import Image from "next/image";

import { cn } from "./cn";
import type { Photograph, PhotoRatio } from "./photo";

/**
 * La fotografía como sistema (ADR-032).
 *
 * Cinco maneras de poner una foto real en la página, y ninguna es «dentro de un
 * rectángulo redondeado». Las fotos no llevan radio ni borde: tocan los bordes,
 * salen del grid o se quedan en la medida del texto, según lo que la composición
 * pida. El epígrafe nunca sangra: se queda en el margen del texto, donde se lee.
 *
 * - `full-bleed`: de borde a borde en teléfono y tableta; vuelve al margen en
 *   escritorio, donde el ancho de la pantalla ya no es el de la foto.
 * - `offset`: arranca en el margen y sale por la derecha. Rompe la columna.
 * - `portrait`: un retrato a 70–90 vw, sin recortar. Para Norma.
 * - `inline`: dentro de la medida de lectura, como una lámina.
 * - `documentary`: la proporción real del archivo, al ancho del contenedor.
 *
 * `crop` recorta a un token `--aspect-*` cuando hace falta que dos fotos queden
 * parejas; sin `crop`, la proporción es la del archivo, que en material
 * documental es lo que corresponde.
 */

export type EditorialVariant =
  "full-bleed" | "offset" | "portrait" | "inline" | "documentary";

/* La clase va en el `figure`, salvo el sangrado, que va en el marco de la foto
   para que el epígrafe se quede en el margen del texto. */
const VARIANT_CLASS: Record<EditorialVariant, string> = {
  "full-bleed": "",
  offset: "bleed-end w-11/12 lg:w-full",
  portrait: "w-5/6 max-w-story sm:w-3/4",
  inline: "max-w-measure",
  documentary: "",
};

const CROP_CLASS: Record<PhotoRatio, string> = {
  portrait: "aspect-portrait",
  landscape: "aspect-landscape",
  wide: "aspect-wide",
  square: "aspect-square",
  card: "aspect-card",
};

export function EditorialImage({
  media,
  variant = "documentary",
  crop,
  caption = true,
  sizes = "100vw",
  quality = 80,
  priority = false,
  stagger,
  position,
  className,
}: {
  media: Photograph;
  variant?: EditorialVariant;
  crop?: PhotoRatio;
  /** `true` muestra el epígrafe del archivo; un string lo reemplaza; `false` lo omite. */
  caption?: boolean | string;
  sizes?: string;
  quality?: 70 | 80;
  /**
   * LCP: carga ya, y no espera al IntersectionObserver. El revelado arranca en
   * opacity 0; si esta foto es la de la ficha, se lee el epígrafe sobre un hueco.
   */
  priority?: boolean;
  /** Retrasa apenas la aparición, para la segunda foto de una pareja. */
  stagger?: boolean;
  /** Punto del recorte cuando hay `crop`. */
  position?: string;
  className?: string;
}) {
  const text = typeof caption === "string" ? caption : caption ? media.caption : null;

  const image = (
    <Image
      src={media.url}
      alt={media.alt}
      width={media.width}
      height={media.height}
      sizes={sizes}
      quality={quality}
      priority={priority}
      className={crop === undefined ? "h-auto w-full" : "h-full w-full object-cover"}
      {...(position === undefined ? {} : { style: { objectPosition: position } })}
    />
  );

  return (
    <figure className={cn("min-w-0", VARIANT_CLASS[variant], className)}>
      {/*
        El wipe escala al 1.03. `overflow: hidden` recorta descendientes, no la
        caja transformada: si el transform va en el mismo nodo que el sangrado,
        la home desborda 6 px (criterio 10). El clip queda afuera, el wipe adentro.
      */}
      <div
        className={cn(
          "overflow-hidden",
          variant === "full-bleed" ? "bleed" : "",
          crop === undefined ? "" : CROP_CLASS[crop],
        )}
      >
        <div
          data-reveal-photo=""
          {...(stagger ? { "data-stagger": "1" } : {})}
          {...(priority ? { "data-in-view": "" } : {})}
        >
          {image}
        </div>
      </div>
      {text === null && media.credit === null ? null : (
        <figcaption className="mt-sm max-w-measure font-ui text-caption text-ink-muted">
          {text}
          {media.credit === null ? null : (
            <span className="block text-ink-faint">Foto: {media.credit}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
