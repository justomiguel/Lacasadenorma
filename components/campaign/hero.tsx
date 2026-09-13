import { HelpCta } from "@/components/campaign/help-cta";
import { SecondaryAction } from "@/components/design-system/actions";
import { CoverPhoto } from "@/components/design-system/photo";
import { ScrollDepth } from "@/components/motion/scroll-depth";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Apertura: foto real a sangrado, título, dos acciones.
 *
 * La foto de fondo es la de los bomberos en la puerta, esa madrugada, y no la
 * del interior quemado que pedía el mockup. No es una decisión de gusto: el
 * interior llegó recortado de un collage y mide **602 px de ancho**; estirado a
 * 1440 px se veía borroso, y una apertura borrosa es lo primero que alguien ve
 * del sitio. Las dos fotos de esa noche miden 1220 px y aguantan el sangrado.
 * El interior pasa al capítulo siguiente, al tamaño que su archivo permite.
 *
 * El header se superpone. 88–96 svh según el viewport, como el mockup.
 */
export function Hero({ locale }: { locale: Locale }) {
  const { site, ui, whatHappened } = getContent(locale);
  const night = whatHappened.photoEssay[0]?.photos ?? [];
  const hero = night[0];
  const quotePhoto = night[1] ?? whatHappened.photoEssay[1]?.photos[0];

  return (
    <ScrollDepth>
      <section
        aria-labelledby="apertura"
        className="relative isolate flex min-h-[88svh] overflow-hidden bg-forest text-paper lg:min-h-[92svh]"
        data-tone="forest"
      >
        {hero === undefined ? null : (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div data-hero-depth="" className="absolute inset-0">
              <div data-hero-photo="" className="absolute inset-0">
                <CoverPhoto
                  media={hero}
                  priority
                  quality={70}
                  sizes="100vw"
                  position="center 45%"
                />
              </div>
            </div>
            <div className="absolute inset-0 bg-forest/50 lg:bg-forest/45" />
          </div>
        )}

        <div className="mx-auto grid w-full max-w-page flex-1 items-end gap-2xl px-5 pb-2xl pt-24 sm:px-xl lg:grid-cols-12 lg:px-4xl lg:pb-3xl lg:pt-32">
          <div className="lg:col-span-6" data-hero-copy="">
            <p
              data-kicker=""
              data-hero-enter="kicker"
              className="font-ui text-small font-medium text-sage"
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
              className="mt-lg max-w-measure text-lead text-paper"
            >
              {ui.home.openingLead}
            </p>

            <div
              data-hero-enter="actions"
              className="mt-xl flex flex-wrap items-center gap-md"
            >
              <HelpCta
                origen="apertura"
                fragment="donaciones"
                tone="sage"
                label={`${ui.helpCta} →`}
              />
              <span data-hero-enter="secondary">
                <SecondaryAction
                  href={localizedHref("/que-paso", locale)}
                  tone="paper"
                  className="lift-hover"
                >
                  {ui.home.knowStory}
                </SecondaryAction>
              </span>
            </div>
          </div>

          {quotePhoto === undefined ? null : (
            <div
              data-hero-enter="quote"
              className="relative hidden lg:col-span-4 lg:col-start-9 lg:block"
            >
              <div className="relative aspect-portrait overflow-hidden rounded-md">
                <CoverPhoto
                  media={quotePhoto}
                  quality={70}
                  sizes="(min-width: 64rem) 32vw, 100vw"
                  position="center"
                />
                <div className="absolute inset-0 bg-forest/45" />
                <p className="absolute inset-x-md bottom-lg font-display text-heading italic text-paper">
                  {ui.home.quoteOverlay}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </ScrollDepth>
  );
}
