import { ContactActions } from "@/components/campaign/contact-actions";
import { DonationBoard } from "@/components/campaign/donation-board";
import { FaqSection } from "@/components/campaign/faq-section";
import { Hero } from "@/components/campaign/hero";
import { ShareBlock } from "@/components/campaign/share-block";
import { InlineLink, SecondaryAction } from "@/components/design-system/actions";
import { Band, Container, Section } from "@/components/design-system/layout";
import { CoverPhoto, Figure } from "@/components/design-system/photo";
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
 * Home del mockup: pérdida → comunidad → acción → donación → legado.
 */
export function HomeScreen({ locale }: { locale: Locale }) {
  const { help, reconstruction, site, ui, whatHappened } = getContent(locale);
  const siteUrl = getSiteUrl();
  const fireMain = whatHappened.photoEssay[1]?.photos[0];
  const fireSide = whatHappened.photoEssay[1]?.photos.slice(1, 3) ?? [];
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
        <Section labelledBy="lo-que-paso">
          <div className="grid items-start gap-2xl lg:grid-cols-12 lg:gap-xl">
            <div className="lg:col-span-5" data-reveal="">
              <p
                data-kicker=""
                className="font-ui text-label uppercase tracking-label text-olive"
              >
                {ui.home.chapterWhatHappened}
              </p>
              <h2 id="lo-que-paso" className="mt-sm font-display text-title">
                {ui.home.fireTitle}
              </h2>
              <p className="mt-lg max-w-measure text-body">{ui.home.fireLead}</p>
              <p className="mt-lg">
                <SecondaryAction href={localizedHref("/que-paso", locale)}>
                  {ui.home.seeStory} →
                </SecondaryAction>
              </p>
            </div>

            <div className="lg:col-span-7">
              {fireMain === undefined ? null : (
                <Figure
                  media={fireMain}
                  reservedFor=""
                  sizes="(min-width: 64rem) 50vw, 100vw"
                />
              )}
              {fireSide.length === 0 ? null : (
                <div className="mt-md grid grid-cols-2 gap-md">
                  {fireSide.map((photo) => (
                    <Figure
                      key={photo.url}
                      media={photo}
                      reservedFor=""
                      sizes="(min-width: 64rem) 25vw, 50vw"
                    />
                  ))}
                </div>
              )}
              <p className="mt-md font-hand text-hand text-olive">{ui.home.houseNote}</p>
            </div>
          </div>
        </Section>
      </Container>

      <Band tone="forest">
        <Container>
          <Section labelledBy="la-comunidad">
            <div className="grid items-center gap-2xl lg:grid-cols-12">
              <div className="lg:col-span-7">
                {community[0] === undefined ? null : (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-md">
                    <CoverPhoto
                      media={community[0]}
                      sizes="(min-width: 64rem) 55vw, 100vw"
                      position="center 40%"
                    />
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
                <h2 id="la-comunidad" className="mt-sm font-display text-title">
                  {ui.home.communityTitle}
                </h2>
                <p className="mt-lg max-w-measure text-body">{ui.home.communityLead}</p>
                <p className="mt-lg font-hand text-hand">{ui.home.communityNote}</p>
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
        <Section labelledBy="como-ayudar">
          <p
            data-kicker=""
            className="font-ui text-label uppercase tracking-label text-olive"
          >
            {ui.home.chapterHelp}
          </p>
          <h2 id="como-ayudar" className="mt-sm font-display text-title">
            {ui.home.helpTitle}
          </h2>
          <p
            data-kicker=""
            className="mt-md font-ui text-label uppercase tracking-label text-ink-muted"
          >
            {ui.home.helpKicker}
          </p>

          <div className="mt-2xl grid gap-lg md:grid-cols-3">
            <article className="rounded-md border border-rule bg-paper p-lg shadow-card">
              <h3 className="font-display text-heading">{ui.home.debrisTitle}</h3>
              <p className="mt-md text-body text-ink-muted">{ui.home.debrisBody}</p>
              <div className="mt-lg">
                <ContactActions
                  name={help.contact.name}
                  phoneDisplay={help.contact.phoneDisplay}
                  phoneTel={help.contact.phoneTel}
                  whatsappLabel={ui.home.whatsapp}
                  callLabel={ui.home.call}
                  origen="home-escombros"
                />
              </div>
            </article>

            <article className="rounded-md border border-rule bg-paper p-lg shadow-card">
              <h3 className="font-display text-heading">{ui.home.materialsTitle}</h3>
              <p className="mt-md text-body text-ink-muted">{ui.home.materialsBody}</p>
              <ul className="mt-md flex flex-wrap gap-xs">
                {help.materials.map((item) => (
                  <li
                    key={item}
                    className="rounded-pill bg-sage px-md py-xs font-ui text-small text-forest"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-md bg-forest p-lg text-paper" data-tone="forest">
              <h3 className="font-display text-heading">{ui.home.remoteTitle}</h3>
              <p className="mt-md text-body">{ui.home.remoteBody}</p>
              <p className="mt-lg">
                <a
                  href="#donaciones"
                  className="inline-flex min-h-touch items-center rounded-pill bg-sage px-lg font-ui text-small font-medium text-forest"
                >
                  {ui.helpCta} →
                </a>
              </p>
            </article>
          </div>
        </Section>
      </Container>

      <Container>
        <Section id="donaciones" labelledBy="donaciones-titulo">
          <p
            data-kicker=""
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
          <p className="mt-xl font-hand text-hand text-olive">{ui.home.thanksNote}</p>
        </Section>
      </Container>

      <Band tone="forest">
        <div className="relative overflow-hidden">
          {community[1] === undefined ? null : (
            <div className="absolute inset-0">
              <CoverPhoto
                media={community[1]}
                sizes="100vw"
                position="center"
                className="opacity-25"
              />
            </div>
          )}
          <Container>
            <Section labelledBy="mas-que-una-casa" className="relative">
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
              <p className="mt-lg font-hand text-hand">{ui.home.nextNote}</p>
              <p className="mt-xl">
                <SecondaryAction
                  href={localizedHref("/legado", locale)}
                  className="border-paper text-paper hover:bg-paper hover:text-forest"
                >
                  {ui.primaryNav["/legado"].label}
                </SecondaryAction>
              </p>
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
