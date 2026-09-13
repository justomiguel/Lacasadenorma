import { HelpCta } from "@/components/campaign/help-cta";
import { SecondaryAction } from "@/components/design-system/actions";
import { CoverPhoto } from "@/components/design-system/photo";
import { ScrollDepth } from "@/components/motion/scroll-depth";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Apertura del mockup: foto real del interior incendiado a sangrado, título, dos CTA.
 * El header se superpone. 88–96 svh según el viewport, como el mockup.
 */
export function Hero({ locale }: { locale: Locale }) {
  const { site, ui, whatHappened } = getContent(locale);
  const after = whatHappened.photoEssay[1]?.photos ?? [];
  const hero = after[1] ?? after[0];
  const quotePhoto = after[0] ?? whatHappened.photoEssay[0]?.photos[0];

  return (
    <ScrollDepth>
      <section
        aria-labelledby="apertura"
        className="relative isolate flex min-h-[88svh] overflow-hidden bg-forest text-paper lg:min-h-[96svh]"
        data-tone="forest"
      >
        {hero === undefined ? null : (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div data-hero-depth="" className="absolute inset-0">
              <div data-hero-photo="" className="absolute inset-0">
                <CoverPhoto
                  media={hero}
                  priority
                  quality={72}
                  sizes="100vw"
                  position="center 38%"
                />
              </div>
            </div>
            <div className="absolute inset-0 bg-forest/40 lg:bg-forest/36" />
          </div>
        )}

        <div className="mx-auto grid w-full max-w-page flex-1 items-end gap-2xl px-5 pb-3xl pt-24 sm:px-xl lg:grid-cols-12 lg:px-4xl lg:pb-4xl lg:pt-32">
          <div className="lg:col-span-6" data-hero-copy="">
            <p
              data-kicker=""
              data-hero-enter="kicker"
              className="font-ui text-label uppercase tracking-label text-sage"
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
              className="mt-xl flex flex-col items-start gap-md sm:flex-row sm:items-center"
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
                  className="lift-hover border-paper text-paper hover:bg-paper hover:text-forest"
                >
                  {ui.home.knowStory}
                </SecondaryAction>
              </span>
            </div>
            <p data-hero-enter="hint" className="mt-xl font-ui text-small text-paper/80">
              {ui.home.scrollHint}
            </p>
          </div>

          {quotePhoto === undefined ? null : (
            <div
              data-hero-enter="quote"
              className="relative hidden lg:col-span-5 lg:col-start-8 lg:block"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-md">
                <CoverPhoto
                  media={quotePhoto}
                  quality={68}
                  sizes="(min-width: 64rem) 40vw, 100vw"
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
