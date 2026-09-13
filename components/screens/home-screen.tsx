import { FaqSection } from "@/components/campaign/faq-section";
import { HelpTabs } from "@/components/campaign/help-tabs";
import { Hero } from "@/components/campaign/hero";
import { previewPhotoFor } from "@/components/campaign/preview-photo";
import { ShareBlock } from "@/components/campaign/share-block";
import { PreviewCard } from "@/components/design-system/card";
import { ChapterHeading, ChapterNav } from "@/components/design-system/chapter";
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
 * Home: un relato en cinco capítulos, con el índice arriba.
 *
 * pérdida → comunidad → cómo ayudar → Norma → lo que viene después.
 *
 * Cada capítulo abre igual (`ChapterHeading`), cambia de superficie respecto
 * del anterior —papel, bosque, papel hundido, papel, bosque— y, si apunta a
 * otra página, cierra con una `PreviewCard` con foto real. Es lo que hace que
 * se vea dónde termina uno y empieza el otro (ADR-026).
 */
export function HomeScreen({ locale }: { locale: Locale }) {
  const { help, legacy, norma, reconstruction, site, ui, whatHappened } =
    getContent(locale);
  const siteUrl = getSiteUrl();
  const after = whatHappened.photoEssay[1]?.photos ?? [];
  const fireMain = after[1] ?? after[0];
  const fireSide = [after[0], after[2]].filter(
    (photo): photo is NonNullable<(typeof after)[0]> => photo !== undefined,
  );
  const community = reconstruction.photoEssay[0]?.photos ?? [];

  const chapters = [
    { fragment: "lo-que-paso", label: ui.home.chapterWhatHappened },
    { fragment: "la-comunidad", label: ui.home.chapterCommunity },
    { fragment: "donaciones", label: ui.home.chapterHelp },
    { fragment: "norma-en-casa", label: `04. ${ui.home.chapterNorma}` },
    { fragment: "mas-que-una-casa", label: ui.home.chapterNext },
  ];

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

      <ChapterNav chapters={chapters} label={ui.home.chaptersLabel} />

      <Container>
        <Section labelledBy="lo-que-paso" chapter="fire" className="scroll-mt-24">
          <div className="grid items-start gap-2xl lg:grid-cols-12 lg:gap-2xl">
            <div className="lg:col-span-5" data-reveal="">
              <ChapterHeading
                label={ui.home.chapterWhatHappened}
                title={ui.home.fireTitle}
                id="lo-que-paso"
              />
              <p className="mt-lg max-w-measure text-body">{ui.home.fireLead}</p>
              <PreviewCard
                className="mt-xl"
                href={localizedHref("/que-paso", locale)}
                title={whatHappened.lead}
                action={ui.home.seeStory}
                media={previewPhotoFor("/que-paso", locale)}
                sizes="(min-width: 64rem) 32vw, 100vw"
              />
            </div>

            <div className="lg:col-span-7">
              {fireMain === undefined ? null : (
                <div data-reveal-photo="wipe">
                  <Figure
                    media={fireMain}
                    crop="wide"
                    reservedFor=""
                    showCaption={false}
                    sizes="(min-width: 64rem) 55vw, 100vw"
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
                    >
                      <Figure
                        media={photo}
                        crop="landscape"
                        reservedFor=""
                        showCaption={false}
                        sizes="(min-width: 64rem) 27vw, 50vw"
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
          <Section labelledBy="la-comunidad" chapter="community" className="scroll-mt-24">
            <div className="grid items-start gap-2xl lg:grid-cols-12 lg:gap-2xl">
              <div className="lg:col-span-5" data-reveal="">
                <ChapterHeading
                  label={ui.home.chapterCommunity}
                  title={ui.home.communityTitle}
                  id="la-comunidad"
                  size="display"
                />
                <p className="mt-lg max-w-measure text-lead">{ui.home.communityLead}</p>
                <p className="mt-xl max-w-measure whitespace-pre-line font-hand text-hand">
                  {ui.home.communityNote}
                </p>
                <PreviewCard
                  className="mt-xl"
                  href={localizedHref("/reconstruccion", locale)}
                  title={reconstruction.title}
                  action={ui.home.seeWork}
                  media={previewPhotoFor("/reconstruccion", locale)}
                  sizes="(min-width: 64rem) 32vw, (min-width: 40rem) 50vw, 100vw"
                />
              </div>
              {community.length === 0 ? null : (
                <div className="grid gap-md sm:grid-cols-2 lg:col-span-7">
                  {community.map((photo, index) => (
                    <div
                      key={photo.url}
                      data-reveal-photo={index === 0 ? "wipe" : "wipe-x"}
                      className="relative aspect-portrait overflow-hidden rounded-md"
                    >
                      <ParallaxFrame className="absolute inset-0">
                        <CoverPhoto
                          media={photo}
                          quality={70}
                          sizes="(min-width: 64rem) 28vw, (min-width: 40rem) 50vw, 100vw"
                          position="center 40%"
                        />
                      </ParallaxFrame>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </Container>
      </Band>

      <Band tone="sunk">
        <Container>
          <Section
            id="donaciones"
            labelledBy="como-ayudar"
            chapter="help"
            className="scroll-mt-24"
          >
            <ChapterHeading
              label={ui.home.chapterHelp}
              title={ui.home.helpTitle}
              id="como-ayudar"
              lead={ui.home.helpKicker}
            />
            <HelpTabs help={help} ui={ui} origen="home" className="mt-2xl" />
          </Section>
        </Container>
      </Band>

      <Container>
        <Section labelledBy="norma-en-casa" chapter="norma" className="scroll-mt-24">
          <ChapterHeading
            label={ui.home.chapterNorma}
            number="04"
            title={norma.openingTitle}
            id="norma-en-casa"
          />
          <PreviewCard
            className="mt-2xl"
            layout="split"
            crop="portrait"
            href={localizedHref("/norma", locale)}
            title={norma.knownAs ?? norma.fullName}
            summary={ui.home.normaLead}
            action={ui.home.seeNorma}
            media={previewPhotoFor("/norma", locale)}
            sizes="(min-width: 64rem) 40vw, 100vw"
          >
            <p className="mt-sm max-w-measure text-small text-ink-muted">
              {norma.paragraphs[0]}
            </p>
          </PreviewCard>
        </Section>
      </Container>

      <Band tone="forest">
        <Container>
          <Section labelledBy="mas-que-una-casa" chapter="next" className="scroll-mt-24">
            <div className="grid gap-2xl lg:grid-cols-12 lg:gap-2xl" data-reveal="">
              <div className="lg:col-span-6">
                <ChapterHeading
                  label={ui.home.chapterNext}
                  title={ui.home.nextTitle}
                  id="mas-que-una-casa"
                  lead={ui.home.nextLead}
                />
              </div>
              <div className="lg:col-span-5 lg:col-start-8 lg:pt-4xl">
                <PreviewCard
                  href={localizedHref("/legado", locale)}
                  title={legacy.title}
                  summary={ui.home.nextBody}
                  action={ui.primaryNav["/legado"].label}
                  media={previewPhotoFor("/legado", locale)}
                  sizes="(min-width: 64rem) 32vw, 100vw"
                >
                  <p className="mt-sm max-w-measure font-hand text-hand text-olive">
                    {ui.home.nextNote}
                  </p>
                </PreviewCard>
              </div>
            </div>
          </Section>
        </Container>
      </Band>

      <Container>
        <Section labelledBy="preguntas">
          <h2 id="preguntas" className="font-display text-heading">
            {ui.home.faqHeading}
          </h2>
          <FaqSection locale={locale} className="mt-xl" />
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
