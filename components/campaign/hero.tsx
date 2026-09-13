import { getImageProps } from "next/image";
import { preload } from "react-dom";

import { HelpCta } from "@/components/campaign/help-cta";
import { SecondaryAction } from "@/components/design-system/actions";
import type { Photograph } from "@/components/design-system/photo";
import { ScrollDepth } from "@/components/motion/scroll-depth";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

const DESKTOP = "(min-width: 64rem)";
const PHONE = "(max-width: 63.99rem)";

/**
 * Apertura: la fotografía de esa noche a sangrado, y encima lo justo (ADR-032).
 *
 * Dirección de arte con `<picture>`: en teléfono va el fotograma vertical original
 * (1220 × 1568), que llena una pantalla de 390 × 690 sin recortar casi nada; en
 * escritorio va el recorte 16:9 del **mismo archivo** agrandado a 2880 px, porque
 * el original estirado a 1440 × 2x pixelaba. No es otra foto ni una imagen
 * generada. Las dos se precargan con su `media`, así que el navegador pide sólo la
 * que va a dibujar.
 *
 * El velo al pie es el único gradiente del sitio y tiene una función: que el
 * título y la acción se lean sobre la foto. Lleva `data-scrim` para que la
 * revisión visual lo distinga de un gradiente decorativo.
 */
export function Hero({ locale }: { locale: Locale }) {
  const { site, ui, whatHappened } = getContent(locale);
  const night = whatHappened.photoEssay[0]?.photos ?? [];
  const tall = night[0] ?? null;
  const wide = whatHappened.hero ?? tall;

  return (
    <ScrollDepth>
      <section
        aria-labelledby="apertura"
        className="relative isolate flex overflow-hidden bg-forest text-paper hero-height"
        data-tone="forest"
      >
        {wide === null || tall === null ? null : (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div data-hero-depth="" className="absolute inset-0">
              <div data-hero-photo="" className="absolute inset-0">
                <HeroPicture tall={tall} wide={wide} />
              </div>
            </div>
            <div
              data-scrim=""
              aria-hidden="true"
              className="absolute inset-0 scrim-bottom"
            />
            <div
              data-scrim=""
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-header scrim-top"
            />
          </div>
        )}

        <div className="mx-auto flex w-full max-w-page flex-1 items-end px-5 pb-2xl pt-6xl sm:px-xl lg:px-4xl lg:pb-3xl">
          <div className="w-full max-w-hero" data-hero-copy="">
            <p
              data-kicker=""
              data-hero-enter="kicker"
              className="font-ui text-eyebrow font-medium uppercase text-sage"
            >
              {ui.home.locationLine}
            </p>
            <h1 id="apertura" className="mt-md font-display text-display text-paper">
              <span className="sr-only">{site.name}</span>
              <span aria-hidden="true">
                <span data-hero-enter="line-1" className="block">
                  La Casa
                </span>
                <span data-hero-enter="line-2" className="block">
                  de Norma
                </span>
              </span>
            </h1>
            <p
              data-hero-enter="copy"
              className="mt-lg max-w-measure text-body-large text-paper"
            >
              {ui.home.openingLead}
            </p>

            <div
              data-hero-enter="actions"
              className="mt-xl flex flex-col items-start gap-md sm:flex-row sm:items-center sm:gap-xl"
            >
              <HelpCta
                origen="apertura"
                fragment="donaciones"
                tone="paper"
                label={ui.helpCta}
              />
              <SecondaryAction href={localizedHref("/que-paso", locale)} tone="paper">
                {ui.home.knowStory}
              </SecondaryAction>
            </div>
          </div>
        </div>
      </section>
    </ScrollDepth>
  );
}

function HeroPicture({ tall, wide }: { tall: Photograph; wide: Photograph }) {
  const common = { alt: tall.alt, sizes: "100vw", quality: 80, priority: true };

  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...common, src: wide.url, width: wide.width, height: wide.height });

  const {
    props: { srcSet: phoneSet, style, ...img },
  } = getImageProps({ ...common, src: tall.url, width: tall.width, height: tall.height });

  if (phoneSet !== undefined) {
    preload(img.src, {
      as: "image",
      imageSrcSet: phoneSet,
      imageSizes: "100vw",
      media: PHONE,
      fetchPriority: "high",
    });
  }

  if (desktopSet !== undefined) {
    preload(wide.url, {
      as: "image",
      imageSrcSet: desktopSet,
      imageSizes: "100vw",
      media: DESKTOP,
      fetchPriority: "high",
    });
  }

  return (
    <picture>
      <source media={DESKTOP} srcSet={desktopSet} />
      <img
        {...img}
        alt={tall.alt}
        srcSet={phoneSet}
        className="h-full w-full object-cover"
        style={{ ...style, objectPosition: "center 35%" }}
      />
    </picture>
  );
}
