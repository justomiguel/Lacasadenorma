import Image from "next/image";

import { cn } from "./cn";

/**
 * Fotografía y espacio reservado.
 *
 * La fotografía es el elemento que **estructura** el sitio: el resto se ordena
 * alrededor de ella (ADR-021). No es un adorno que se agrega al final.
 *
 * Mientras no haya foto real **no se usan ilustraciones, ni imágenes de stock, ni
 * imágenes generadas**: se reserva el espacio con la proporción correcta y se dice
 * qué va ahí. Un espacio vacío con intención se lee como respeto; una foto de
 * stock se lee como mentira. Pero es un estado **transitorio**: si el material
 * puede tardar, la página tiene que verse terminada sin él.
 *
 * Las fotos no llevan radio: van a escuadra, como en un impreso.
 */

/**
 * Lo que estos componentes necesitan de una foto, sin importar de dónde viene.
 *
 * Las fotos llegan por dos caminos —las editoriales desde `content/`, las del
 * avance de la obra desde la base—, y `MediaAsset` cumple esta forma. El tipo se
 * declara acá, estructural y mínimo, para que el componente no tenga que saber
 * cuál de los dos le tocó.
 */
export interface Photograph {
  readonly url: string;
  readonly alt: string;
  readonly caption: string | null;
  readonly credit: string | null;
  readonly width: number;
  readonly height: number;
}

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
  media: Photograph | null;
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
      /* La marca la cuenta `revision-visual.spec.ts`: un hueco reservado en una
         página donde ya hay material es material que se entregó y nadie ubicó, y
         ése fue exactamente el estado del sitio durante once páginas (ADR-021). */
      data-espacio-reservado
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
 * Una foto que sangra **en teléfono** y vuelve al margen en escritorio.
 *
 * El sangrado completo estaba prometido en `ux.md` §4 y nunca se usó. Cuando llegó
 * el material se vio por qué no alcanzaba con quererlo: **todas las fotos que
 * entregó la familia son verticales o casi cuadradas**, porque se sacaron con un
 * teléfono en la mano. Una foto de proporción 1,03 a 1440 px de ancho mide 1390 px
 * de alto: no es una banda, es una pared. Y la única apaisada de verdad —el frente
 * de la casa, 1,8— vino recortada de un collage y tiene 602 px de ancho.
 *
 * Así que el sangrado se resuelve donde el material sí lo permite y donde además
 * más falta hacía: en 360 px, donde cualquiera de estas fotos es más ancha que la
 * pantalla y llegar de borde a borde es la diferencia entre un documento y una
 * columna de texto. Desde `lg` la foto vuelve a la grilla, que es lo que su
 * proporción pide.
 *
 * El epígrafe nunca sangra: se queda en el margen del texto, que es donde se lee.
 */
export function BleedOnMobile({
  media,
  priority = false,
  sizes = "(min-width: 64rem) 50vw, 100vw",
  className,
}: {
  media: Photograph;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      {/* `-mx-5` cancela el padding del contenedor para salir al borde, y se
          desactiva en cada breakpoint donde el padding cambia. */}
      <div className="-mx-5 sm:-mx-xl lg:mx-0">
        <Image
          src={media.url}
          alt={media.alt}
          width={media.width}
          height={media.height}
          sizes={sizes}
          priority={priority}
          className="w-full"
        />
      </div>
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
 * Un ensayo fotográfico en tramos: cada tramo con su título y sus fotos.
 *
 * La agrupación **es** el relato, y por eso no es una galería ni un carrusel. Las
 * fotos del incendio y las del trabajo no se mezclan: van en tramos separados,
 * porque la diferencia entre lo que se perdió y lo que se está haciendo es el
 * argumento entero de la campaña (`ux.md` §1).
 *
 * Las fotos conservan su proporción real. No se recortan a una grilla prolija: el
 * material es documental, se sacó con un teléfono en la mano, y forzarlo a 4:3
 * cortaría justo lo que la foto fue a buscar.
 */
export function PhotoSequence({
  groups,
  className,
}: {
  groups: readonly {
    heading: string;
    note: string | null;
    photos: readonly Photograph[];
  }[];
  className?: string;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3xl", className)}>
      {groups.map((group) => (
        <section key={group.heading}>
          <h3 className="font-prose text-subheading font-medium">{group.heading}</h3>
          {group.note === null ? null : (
            <p className="mt-sm max-w-measure text-body text-ink-muted">{group.note}</p>
          )}

          <div className="mt-lg grid gap-lg sm:grid-cols-2">
            {group.photos.map((photo, index) => (
              <Figure
                key={photo.url}
                media={photo}
                reservedFor=""
                sizes="(min-width: 40rem) 50vw, 100vw"
                /* La primera de cada tramo es la que se ve entera antes de
                   desplazarse, así que es la que conviene cargar con prioridad. */
                priority={index === 0}
                /* Cuando el tramo tiene una cantidad impar de fotos, la primera
                   ocupa las dos columnas: así no queda un hueco al final de la
                   grilla, y la que abre el tramo es la que más se ve. */
                {...(group.photos.length % 2 === 1 && index === 0
                  ? { className: "sm:col-span-2" }
                  : {})}
              />
            ))}
          </div>
        </section>
      ))}
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
  media: readonly (Photograph & { id: string })[];
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
