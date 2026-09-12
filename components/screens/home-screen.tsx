import { BudgetList } from "@/components/campaign/budget-list";
import { DonationMethods } from "@/components/campaign/donation-methods";
import { FaqSection } from "@/components/campaign/faq-section";
import { HelpCta } from "@/components/campaign/help-cta";
import { Hero } from "@/components/campaign/hero";
import { CampaignProgress } from "@/components/campaign/progress";
import { ShareBlock } from "@/components/campaign/share-block";
import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink, SecondaryAction } from "@/components/design-system/actions";
import { Band, Container, Section } from "@/components/design-system/layout";
import { Figure, ReservedSpace } from "@/components/design-system/photo";
import { Stat, StatGroup } from "@/components/design-system/figures";
import {
  Paragraphs,
  SectionHeading,
  Testimony,
} from "@/components/design-system/typography";
import { PageIndex } from "@/components/site/page-index";
import { StructuredData } from "@/components/site/structured-data";
import { getContent } from "@/content";
import { getCampaignOverview } from "@/src/application/use-cases/get-campaign-overview";
import { getDonationMethods } from "@/src/application/use-cases/get-donation-methods";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import {
  donateActionSchema,
  faqSchema,
  graph,
  webPageSchema,
} from "@/src/infrastructure/seo/structured-data";
import { getSiteUrl } from "@/src/infrastructure/site-url";

export const revalidate = 300;

export async function HomeScreen({ locale }: { locale: Locale }) {
  const { legacy, norma, reconstruction, site, ui, whatHappened } = getContent(locale);
  const dataLayer = getPublicDataLayer();

  const [overview, donations] = await Promise.all([
    getCampaignOverview({ dataLayer, logger }),
    getDonationMethods({ dataLayer, logger }),
  ]);

  const siteUrl = getSiteUrl();
  const help = {
    origen: "seccion-ayudar",
    href: localizedHref("/ayudar", locale),
    label: ui.helpCta,
  };

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

      <PageIndex locale={locale} ui={ui} />

      <Container>
        <Section labelledBy="quien-fue">
          <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg">
            <div className="lg:col-span-7">
              <SectionHeading title={ui.home.whoWasHeading} id="quien-fue" />
              <Paragraphs items={norma.paragraphs} />
              <p className="mt-lg">
                <InlineLink href={localizedHref("/norma", locale)}>
                  {ui.home.readFullStory}
                </InlineLink>
              </p>
            </div>

            <div className="lg:col-span-4 lg:col-start-9">
              {norma.photos[0] === undefined ? (
                <ReservedSpace
                  ratio="landscape"
                  description={ui.home.radioPhotoReserved}
                />
              ) : (
                <Figure
                  media={norma.photos[0]}
                  reservedFor=""
                  sizes="(min-width: 64rem) 33vw, 100vw"
                />
              )}
            </div>
          </div>
        </Section>
      </Container>

      <Band tone="ink">
        <Container>
          <Section labelledBy="que-paso">
            <h2 id="que-paso" className="font-prose text-title">
              {whatHappened.lead}
            </h2>
            <Paragraphs items={whatHappened.paragraphs.slice(0, 2)} className="mt-xl" />

            {whatHappened.testimony === null ? null : (
              <Testimony
                quote={whatHappened.testimony.quote}
                author={whatHappened.testimony.author}
                relation={whatHappened.testimony.relation}
                className="mt-3xl"
              />
            )}

            <p className="mt-3xl">
              <InlineLink href={localizedHref("/que-paso", locale)}>
                {ui.home.seePhotosAndNeeds}
              </InlineLink>
            </p>
          </Section>
        </Container>
      </Band>

      <Container>
        <Section labelledBy="reconstruir">
          <SectionHeading title={ui.home.rebuildHeading} id="reconstruir" />
          <Paragraphs items={reconstruction.paragraphs} />

          {overview.status === "ok" ? (
            <BudgetList
              items={overview.data.budgetItems}
              locale={locale}
              ui={ui}
              className="mt-xl"
            />
          ) : (
            <Unavailable
              reason={overview.reason}
              copy={ui.unavailable}
              className="mt-xl"
            />
          )}

          <p className="mt-lg">
            <InlineLink href={localizedHref("/reconstruccion", locale)}>
              {ui.home.rebuildDetail}
            </InlineLink>
          </p>
        </Section>
      </Container>

      <Container>
        <Section labelledBy="como-va">
          <SectionHeading title={ui.home.howItsGoing} id="como-va" />

          {overview.status === "ok" ? (
            <CampaignProgress
              fundraising={overview.data.fundraising}
              milestones={overview.data.milestones}
              reconciledAt={overview.data.transparency.reconciledAt}
              reconciliationIsStale={overview.data.transparency.reconciliationIsStale}
              locale={locale}
              ui={ui}
            />
          ) : (
            <Unavailable reason={overview.reason} copy={ui.unavailable} />
          )}
        </Section>
      </Container>

      <Container>
        <Section labelledBy="como-ayudar">
          <SectionHeading title={ui.home.howToHelp} id="como-ayudar" />

          {donations.status === "ok" ? (
            <DonationMethods
              methods={donations.data.methods}
              countries={donations.data.countries}
            />
          ) : (
            <Unavailable reason={donations.reason} copy={ui.unavailable} />
          )}

          <div className="mt-2xl flex flex-col items-start gap-lg sm:flex-row sm:items-center">
            <HelpCta {...help} label={ui.home.seeFullDetails} />
            <SecondaryAction href={localizedHref("/transparencia", locale)}>
              {ui.home.seeWhereItWent}
            </SecondaryAction>
          </div>
        </Section>
      </Container>

      <Container>
        <Section labelledBy="en-que-se-uso">
          <SectionHeading title={ui.home.whereItWent} id="en-que-se-uso" />

          {overview.status === "ok" ? (
            <>
              <StatGroup>
                <Stat
                  label={ui.figures.received}
                  amount={overview.data.transparency.primary.received}
                  locale={locale}
                />
                <Stat
                  label={ui.figures.spent}
                  amount={overview.data.transparency.primary.spent}
                  locale={locale}
                />
                <Stat
                  label={ui.figures.balance}
                  amount={overview.data.transparency.primary.balance}
                  locale={locale}
                />
              </StatGroup>
              <p className="mt-xl max-w-measure text-body">
                {ui.home.transparencyBlurb}{" "}
                <InlineLink href={localizedHref("/transparencia", locale)}>
                  {ui.home.seeFullReport}
                </InlineLink>
              </p>
            </>
          ) : (
            <Unavailable reason={overview.reason} copy={ui.unavailable} />
          )}
        </Section>
      </Container>

      <Container>
        <Section labelledBy="que-sigue">
          <SectionHeading title={legacy.lead} id="que-sigue" />
          <Paragraphs items={legacy.paragraphs.slice(0, 2)} />
          <p className="mt-lg">
            <InlineLink href={localizedHref("/legado", locale)}>
              {ui.home.knowFoundation}
            </InlineLink>
          </p>
          <p className="mt-sm">
            <InlineLink href={localizedHref("/riacho-conecta", locale)}>
              {ui.home.seeRiacho}
            </InlineLink>
          </p>
        </Section>
      </Container>

      <Container>
        <Section labelledBy="preguntas">
          <SectionHeading title={ui.home.faqHeading} id="preguntas" />
          <FaqSection locale={locale} />
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">{ui.home.shareHeading}</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            {ui.home.shareLead}
          </p>
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
