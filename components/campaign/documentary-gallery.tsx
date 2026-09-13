import { EditorialImage } from "@/components/design-system/editorial-image";
import type { Photograph } from "@/components/design-system/photo";

/**
 * Composiciones fotográficas del relato (ADR-032).
 *
 * No es una grilla de tarjetas ni un carrusel: cada composición está pensada
 * para el material que hay y para el ancho de un teléfono. Las fotos conservan
 * su proporción real —se sacaron con un teléfono en la mano— y ninguna lleva
 * radio ni borde.
 *
 * - `aftermath`: lo que quedó. Una foto que sale del grid por la derecha y dos
 *   chicas debajo, con la nota manuscrita de la familia.
 * - `overlap`: la gente que apareció. Una vertical grande y otra que se le monta
 *   encima desde la derecha, como dos fotos sobre una mesa.
 */
export function DocumentaryGallery({
  photos,
  variant,
  note,
  className,
}: {
  photos: readonly Photograph[];
  variant: "aftermath" | "overlap";
  note?: string;
  className?: string;
}) {
  const [first, ...rest] = photos;

  if (first === undefined) {
    return null;
  }

  if (variant === "overlap") {
    const second = rest[0];

    return (
      <div className={className}>
        <EditorialImage
          media={first}
          variant="full-bleed"
          caption={false}
          quality={70}
          sizes="(min-width: 64rem) 40vw, 100vw"
          className="lg:w-3/4"
        />
        {second === undefined ? null : (
          <EditorialImage
            media={second}
            variant="documentary"
            caption={false}
            quality={70}
            stagger
            sizes="(min-width: 64rem) 28vw, 75vw"
            className="relative z-10 -mt-2xl ml-auto w-3/4 bleed-end lg:-mt-6xl lg:mr-0 lg:w-1/2"
          />
        )}
        {note === undefined ? null : (
          <p className="mt-lg max-w-measure whitespace-pre-line font-hand text-hand">
            {note}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <EditorialImage
        media={first}
        variant="offset"
        caption={false}
        quality={70}
        sizes="(min-width: 64rem) 50vw, 92vw"
      />
      {rest.length === 0 ? null : (
        <div className="mt-sm grid grid-cols-2 gap-sm lg:mt-md lg:gap-md">
          {rest.slice(0, 2).map((photo, index) => (
            <EditorialImage
              key={photo.url}
              media={photo}
              variant="documentary"
              crop="landscape"
              caption={false}
              quality={70}
              stagger={index === 1}
              sizes="(min-width: 64rem) 25vw, 50vw"
            />
          ))}
        </div>
      )}
      {note === undefined ? null : (
        <p className="mt-md max-w-measure font-hand text-hand text-olive">{note}</p>
      )}
    </div>
  );
}
