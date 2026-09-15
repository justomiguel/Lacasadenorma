import { DocumentaryGallery } from "@/components/campaign/documentary-gallery";
import { FaqSection } from "@/components/campaign/faq-section";
import { HelpPaths } from "@/components/campaign/help-paths";
import { Hero } from "@/components/campaign/hero";
import { NormaStory } from "@/components/campaign/norma-story";
import { ShareBlock } from "@/components/campaign/share-block";
import { StoryHeading, StorySection } from "@/components/campaign/story-section";
import { SecondaryAction } from "@/components/design-system/actions";
import { EditorialImage } from "@/components/design-system/editorial-image";
import { Container, Section } from "@/components/design-system/layout";
import { StructuredData } from "@/components/site/structured-data";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import {
  donateActionSchema,
  faqSchema,
  graph,
  webPageSchema,
} from "@/src/infrastructure/seo/structured-data";
import { getSiteUrl } from "@/src/infrastructure/site-url";

/**
 * Home: un relato que se lee desplazándose (ADR-032).
 *
 * incendio → comunidad → ayuda → Norma → lo que viene.
 *
 * No hay índice ni tarjetas: cada momento abre con `StoryHeading`, la fotografía
 * hace la estructura y el aire separa. La superficie cambia con el relato —papel,
 * bosque, papel hundido, carbón, papel— y el único tono oscuro del sitio es el de
 * Norma, porque ella es el momento que rompe el ritmo.
 */
export function HomeScreen({ locale }: { locale: Locale }) {
  const { norma, reconstruction, site, ui, whatHappened } = getContent(locale);
  const siteUrl = getSiteUrl();
  const night = whatHappened.photoEssay[0]?.photos ?? [];
  const flames = night[1] ?? night[0];
  const after = whatHappened.photoEssay[1]?.photos ?? [];
  const community = reconstruction.photoEssay[0]?.photos ?? [];

  return (
    <>
      <StructuredData
        json={graph([
          webPageSchema({
            siteUrl,
            path: "/",
            name: `${site.name} — ${site.tagline}`,
            description: site.shortDescription,
            locale,
          }),
          faqSchema(locale),
          donateActionSchema(siteUrl, locale),
        ])}
      />

      <Hero locale={locale} />

      <StorySection labelledBy="lo-que-paso" chapter="fire">
        <div className="lg:grid lg:grid-cols-12 lg:gap-2xl">
          <StoryHeading
            label={ui.home.chapterWhatHappened}
            title={ui.home.fireTitle}
            id="lo-que-paso"
            className="lg:col-span-5"
          />
          <div
            className="mt-lg lg:col-span-6 lg:col-start-7 lg:mt-0 lg:pt-4xl"
            data-reveal=""
          >
            <p className="max-w-measure text-body-large">{ui.home.fireLead}</p>
            <SecondaryAction href={localizedHref("/que-paso", locale)} className="mt-lg">
              {ui.home.seeStory}
            </SecondaryAction>
          </div>
        </div>

        {flames === undefined || flames === null ? null : (
          <EditorialImage
            media={flames}
            variant="full-bleed"
            caption={whatHappened.photoEssay[0]?.note ?? true}
            sizes="(min-width: 80rem) 80rem, 100vw"
            className="mt-2xl lg:mt-4xl"
          />
        )}

        <DocumentaryGallery
          photos={after}
          variant="aftermath"
          note={ui.home.houseNote}
          className="mt-2xl lg:mt-4xl"
        />
      </StorySection>

      <StorySection labelledBy="la-comunidad" chapter="community" tone="forest">
        <div className="lg:grid lg:grid-cols-12 lg:gap-2xl">
          <StoryHeading
            label={ui.home.chapterCommunity}
            title={ui.home.communityTitle}
            id="la-comunidad"
            size="display"
            className="lg:col-span-6"
          />
          <div
            className="mt-lg lg:col-span-5 lg:col-start-8 lg:mt-0 lg:pt-4xl"
            data-reveal=""
          >
            <p className="max-w-measure text-body-large">{ui.home.communityLead}</p>
          </div>
        </div>

        <div className="mt-2xl lg:mt-4xl lg:grid lg:grid-cols-12 lg:gap-2xl">
          <DocumentaryGallery
            photos={community}
            variant="overlap"
            note={ui.home.communityNote}
            className="lg:col-span-8"
          />
          <div className="mt-xl lg:col-span-4 lg:mt-0 lg:self-end" data-reveal="">
            <SecondaryAction href={localizedHref("/reconstruccion", locale)} tone="paper">
              {ui.home.seeWork}
            </SecondaryAction>
          </div>
        </div>
      </StorySection>

      <StorySection id="donaciones" labelledBy="como-ayudar" chapter="help" tone="sunk">
        <StoryHeading
          label={ui.home.chapterHelp}
          title={ui.home.helpTitle}
          id="como-ayudar"
          lead={ui.home.helpKicker}
        />
        <HelpPaths locale={locale} ui={ui} heading="h3" className="mt-2xl" />
      </StorySection>

      <StorySection labelledBy="norma-en-casa" chapter="norma" tone="ink">
        <NormaStory
          locale={locale}
          portrait={norma.portrait}
          name={norma.fullName}
          number="04"
          title={norma.openingTitle}
          lead={ui.home.normaLead}
          action={ui.home.seeNorma}
        />
      </StorySection>

      <StorySection labelledBy="mas-que-una-casa" chapter="next">
        <div className="lg:grid lg:grid-cols-12 lg:gap-2xl">
          <StoryHeading
            label={ui.home.chapterNext}
            title={ui.home.nextTitle}
            id="mas-que-una-casa"
            lead={ui.home.nextLead}
            className="lg:col-span-6"
          />
          <div
            className="mt-xl lg:col-span-5 lg:col-start-8 lg:mt-0 lg:pt-4xl"
            data-reveal=""
          >
            <p className="max-w-measure text-body text-ink-muted">{ui.home.nextBody}</p>
            <p className="mt-lg max-w-measure font-hand text-hand text-olive">
              {ui.home.nextNote}
            </p>
            <SecondaryAction href={localizedHref("/legado", locale)} className="mt-lg">
              {ui.primaryNav["/legado"].label}
            </SecondaryAction>
          </div>
        </div>
      </StorySection>

      <Container>
        <Section labelledBy="preguntas" className="border-t border-rule">
          <h2 id="preguntas" className="font-display text-section-title text-ink-muted">
            {ui.home.faqHeading}
          </h2>
          <FaqSection locale={locale} className="mt-lg" />
        </Section>
      </Container>

      <Container>
        <Section id="compartir" tight className="border-t border-rule">
          <p className="font-ui text-caption text-ink-muted">{ui.share}</p>
          <ShareBlock
            className="mt-sm"
            url={locale === "es" ? siteUrl : `${siteUrl}/en`}
            route={localizedHref("/", locale)}
            title={`${site.name} — ${site.tagline}`}
            text={site.shortDescription}
          />
        </Section>
      </Container>
    </>
  );
}
