import { HelpCta } from "@/components/campaign/help-cta";
import { SecondaryAction } from "@/components/design-system/actions";
import { CoverPhoto } from "@/components/design-system/photo";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Apertura del mockup: foto real del incendio a sangrado, título, dos CTA.
 * El header se superpone. No es min-height: 100vh: el ritmo lo marca el contenido.
 */
export function Hero({ locale }: { locale: Locale }) {
  const { site, ui, whatHappened } = getContent(locale);
  const hero =
    whatHappened.photoEssay[1]?.photos[1] ?? whatHappened.photoEssay[0]?.photos[0];
  const quotePhoto =
    whatHappened.photoEssay[1]?.photos[0] ?? whatHappened.photoEssay[0]?.photos[1];

  return (
    <section
      aria-labelledby="apertura"
      className="relative isolate overflow-hidden bg-forest text-paper"
      data-tone="forest"
    >
      {hero === undefined ? null : (
        <div className="absolute inset-0 -z-10">
          <CoverPhoto
            media={hero}
            priority
            sizes="100vw"
            position="center 30%"
            className="opacity-55 lg:opacity-50"
          />
          <div className="absolute inset-0 bg-forest/45" />
        </div>
      )}

      <div className="mx-auto grid w-full max-w-page items-end gap-2xl px-5 pb-3xl pt-24 sm:px-xl lg:grid-cols-12 lg:px-4xl lg:pb-4xl lg:pt-32">
        <div className="lg:col-span-6" data-reveal="">
          <p
            data-kicker=""
            className="font-ui text-label uppercase tracking-label text-sage"
          >
            {ui.home.locationLine}
          </p>
          <h1 id="apertura" className="mt-md font-display text-display text-paper">
            <span className="sr-only">{site.name}</span>
            <span aria-hidden="true">
              <span className="block">La Casa</span>
              <span className="block">de Norma</span>
            </span>
          </h1>
          <p className="mt-lg max-w-measure text-lead text-paper">
            {ui.home.openingLead}
          </p>

          <div className="mt-xl flex flex-col items-start gap-md sm:flex-row sm:items-center">
            <HelpCta
              origen="apertura"
              fragment="donaciones"
              tone="sage"
              label={`${ui.helpCta} →`}
            />
            <SecondaryAction
              href={localizedHref("/que-paso", locale)}
              className="border-paper text-paper hover:bg-paper hover:text-forest"
            >
              {ui.home.knowStory}
            </SecondaryAction>
          </div>
          <p className="mt-xl hidden font-ui text-small text-paper/80 sm:block">
            {ui.home.scrollHint}
          </p>
        </div>

        {quotePhoto === undefined ? null : (
          <div className="relative hidden lg:col-span-5 lg:col-start-8 lg:block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-md">
              <CoverPhoto
                media={quotePhoto}
                priority
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
  );
}
