import { DonationBoard } from "@/components/campaign/donation-board";
import { FaqSection } from "@/components/campaign/faq-section";
import { HelpWays } from "@/components/campaign/help-ways";
import { Hero } from "@/components/campaign/hero";
import { ShareBlock } from "@/components/campaign/share-block";
import { InlineLink, SecondaryAction } from "@/components/design-system/actions";
import { Band, Container, Section } from "@/components/design-system/layout";
import { CoverPhoto, Figure } from "@/components/design-system/photo";
import { ParallaxFrame } from "@/components/motion/parallax-frame";
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
 * Home del mockup: pérdida → comunidad → ayuda → donación → Norma → legado.
 */
export function HomeScreen({ locale }: { locale: Locale }) {
  const { help, norma, reconstruction, site, ui, whatHappened } = getContent(locale);
  const siteUrl = getSiteUrl();
  const after = whatHappened.photoEssay[1]?.photos ?? [];
  const fireMain = after[1] ?? after[0];
  const fireSide = [after[0], after[2]].filter(
    (photo): photo is NonNullable<(typeof after)[0]> => photo !== undefined,
  );
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

      <Container>
        <Section labelledBy="lo-que-paso" chapter="fire">
          <div className="grid items-start gap-2xl lg:grid-cols-12 lg:gap-xl">
            <div className="lg:col-span-5" data-reveal="">
              <p
                data-kicker=""
                className="font-ui text-label uppercase tracking-label text-olive"
              >
                {ui.home.chapterWhatHappened}
              </p>
              <h2
                id="lo-que-paso"
                className="mt-sm whitespace-pre-line font-display text-title"
              >
                {ui.home.fireTitle}
              </h2>
              <p className="mt-lg max-w-measure text-body">{ui.home.fireLead}</p>
            </div>

            <div className="lg:col-span-7">
              {fireMain === undefined ? null : (
                <div data-reveal-photo="wipe" className="overflow-hidden rounded-md">
                  <Figure
                    media={fireMain}
                    reservedFor=""
                    showCaption={false}
                    sizes="(min-width: 64rem) 50vw, 100vw"
                  />
                </div>
              )}
              {fireSide.length === 0 ? null : (
                <div className="mt-md grid min-w-0 grid-cols-2 gap-md">
                  {fireSide.map((photo, index) => (
                    <div
                      key={photo.url}
                      data-reveal-photo="wipe-x"
                      data-stagger={index === 0 ? "1" : "2"}
                      className="overflow-hidden rounded-md"
                    >
                      <Figure
                        media={photo}
                        reservedFor=""
                        showCaption={false}
                        sizes="(min-width: 64rem) 25vw, 50vw"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-md max-w-measure font-hand text-hand text-olive">
                {ui.home.houseNote}
              </p>
            </div>
          </div>
        </Section>
      </Container>

      <Band tone="forest">
        <Container>
          <Section labelledBy="la-comunidad" chapter="community">
            <div className="grid items-center gap-2xl lg:grid-cols-12">
              <div className="lg:col-span-7">
                {community[0] === undefined ? null : (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-md">
                    <ParallaxFrame className="absolute inset-[-6%]">
                      <CoverPhoto
                        media={community[0]}
                        quality={70}
                        sizes="(min-width: 64rem) 55vw, 100vw"
                        position="center 40%"
                      />
                    </ParallaxFrame>
                  </div>
                )}
              </div>
              <div className="lg:col-span-5" data-reveal="">
                <p
                  data-kicker=""
                  className="font-ui text-label uppercase tracking-label text-sage"
                >
                  {ui.home.chapterCommunity}
                </p>
                <h2
                  id="la-comunidad"
                  className="mt-sm whitespace-pre-line font-display text-title"
                >
                  {ui.home.communityTitle}
                </h2>
                <p className="mt-lg max-w-measure text-body">{ui.home.communityLead}</p>
                <p
                  data-reveal=""
                  className="mt-lg max-w-measure whitespace-pre-line font-hand text-hand"
                >
                  {ui.home.communityNote}
                </p>
                <p className="mt-lg">
                  <InlineLink href={localizedHref("/que-paso", locale)}>
                    {ui.home.seeStory} →
                  </InlineLink>
                </p>
              </div>
            </div>
          </Section>
        </Container>
      </Band>

      <Container>
        <Section labelledBy="como-ayudar" chapter="help">
          <p
            data-kicker=""
            data-reveal=""
            className="font-ui text-label uppercase tracking-label text-olive"
          >
            {ui.home.chapterHelp}
          </p>
          <h2
            id="como-ayudar"
            className="mt-sm whitespace-pre-line font-display text-title"
          >
            {ui.home.helpTitle}
          </h2>
          <p
            data-kicker=""
            className="mt-md font-ui text-label uppercase tracking-label text-ink-muted"
          >
            {ui.home.helpKicker}
          </p>

          <HelpWays help={help} ui={ui} origen="home" remoteHref="#donaciones" />
        </Section>
      </Container>

      <Container>
        <Section id="donaciones" labelledBy="donaciones-titulo" className="scroll-mt-24">
          <p
            data-kicker=""
            data-reveal=""
            className="font-ui text-label uppercase tracking-label text-olive"
          >
            {ui.home.chapterDonate}
          </p>
          <h2 id="donaciones-titulo" className="mt-sm font-display text-title">
            {ui.home.donateTitle}
          </h2>
          <p className="mt-md max-w-measure text-body text-ink-muted">
            {ui.home.donateLead}
          </p>
          <DonationBoard help={help} ui={ui} className="mt-2xl" />
          <p className="mt-xl max-w-measure font-hand text-hand text-olive">
            {ui.home.thanksNote}
          </p>
        </Section>
      </Container>

      <Container>
        <Section labelledBy="norma-en-casa" chapter="norma">
          <div className="grid items-center gap-2xl lg:grid-cols-12">
            <div className="lg:col-span-6" data-reveal="">
              <p
                data-kicker=""
                className="font-ui text-label uppercase tracking-label text-olive"
              >
                {ui.home.chapterNorma}
              </p>
              <h2
                id="norma-en-casa"
                className="mt-sm whitespace-pre-line font-display text-title"
              >
                {norma.openingTitle}
              </h2>
              <p className="mt-lg max-w-measure text-body">{ui.home.normaLead}</p>
              <p className="mt-lg max-w-measure text-body text-ink-muted">
                {norma.paragraphs[0]}
              </p>
              <p className="mt-xl">
                <InlineLink href={localizedHref("/norma", locale)}>
                  {ui.home.seeNorma} →
                </InlineLink>
              </p>
            </div>
            {norma.portrait === null ? null : (
              <div className="lg:col-span-5 lg:col-start-8">
                <div data-reveal-photo="wipe" className="overflow-hidden rounded-md">
                  <Figure
                    media={norma.portrait}
                    reservedFor=""
                    showCaption={false}
                    sizes="(min-width: 64rem) 40vw, 90vw"
                  />
                </div>
              </div>
            )}
          </div>
        </Section>
      </Container>

      <Band tone="forest">
        <div className="relative overflow-hidden" data-chapter="next">
          {community[1] === undefined ? null : (
            <div className="absolute inset-0">
              <CoverPhoto
                media={community[1]}
                quality={64}
                sizes="100vw"
                position="center"
                className="opacity-[0.32]"
              />
            </div>
          )}
          <Container>
            <Section labelledBy="mas-que-una-casa" className="relative">
              <div data-reveal="">
                <p
                  data-kicker=""
                  className="font-ui text-label uppercase tracking-label text-sage"
                >
                  {ui.home.chapterNext}
                </p>
                <h2 id="mas-que-una-casa" className="mt-sm font-display text-title">
                  {ui.home.nextTitle}
                </h2>
                <p className="mt-lg max-w-measure text-lead">{ui.home.nextLead}</p>
                <p className="mt-md max-w-measure text-body">{ui.home.nextBody}</p>
                <p className="mt-lg max-w-measure font-hand text-hand">
                  {ui.home.nextNote}
                </p>
                <p className="mt-xl">
                  <SecondaryAction
                    href={localizedHref("/legado", locale)}
                    className="lift-hover border-paper text-paper hover:bg-paper hover:text-forest"
                  >
                    {ui.primaryNav["/legado"].label}
                  </SecondaryAction>
                </p>
              </div>
            </Section>
          </Container>
        </div>
      </Band>

      <Container>
        <Section labelledBy="preguntas" tight>
          <h2 id="preguntas" className="font-display text-heading">
            {ui.home.faqHeading}
          </h2>
          <FaqSection locale={locale} />
        </Section>
      </Container>

      <Container>
        <Section id="compartir" tight className="border-t border-rule">
          <h2 className="font-display text-heading">{ui.share}</h2>
          <ShareBlock
            className="mt-lg"
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
