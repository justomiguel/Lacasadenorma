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
import { Figure } from "@/components/design-system/photo";
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

/**
 * La home.
 *
 * El orden de las secciones **es** el argumento, y desde ADR-024 recorre cuatro
 * movimientos: pérdida → comunidad → reconstrucción → legado. Antes iba pérdida →
 * reconstrucción → legado, y el segundo movimiento faltaba: el sitio mostraba una
 * casa quemada y a continuación una lista de precios, así que quien colaboraba
 * estaba poniendo plata en un presupuesto y no sumándose a algo que ya se estaba
 * haciendo. «El trabajo ya empezó» es ese movimiento, y no hubo que inventarle
 * nada: las dos fotos de la limpieza ya estaban publicadas en `/reconstruccion`.
 *
 * Dos cosas que se ven poco y conviene no deshacer:
 *
 * 1. **El presupuesto y el avance son una sección, no dos.** Eran «Qué hay que
 *    reconstruir» y «Cómo va» al mismo nivel, y con eso la página tenía dos `h2`
 *    hablando de la misma obra y el avance quedaba a una pantalla de la lista que
 *    explica de qué avance se trata. «Cómo va la obra» es un `h3` adentro.
 * 2. **La última sección tiene `id="compartir"` porque la apertura le apunta.** La
 *    quinta pregunta que la apertura tiene que contestar es cómo compartir esto, y
 *    se contestaba catorce pantallas más abajo.
 */
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

  /* La primera foto del primer tramo del ensayo de la obra: la de los escombros
     saliendo a mano. Se toma de ahí y no de una lista propia para que el día que la
     familia mande una foto mejor haya un solo lugar donde cambiarla. */
  const workPhoto = reconstruction.photoEssay[0]?.photos[0] ?? null;

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

            {/* Sin hueco reservado cuando no hay foto: en esta sección la prosa se
                sostiene sola, y un rectángulo gris al lado de la historia de Norma
                anuncia una falta que no le importa a nadie más que a nosotros. */}
            {norma.photos[0] === undefined ? null : (
              <div className="lg:col-span-4 lg:col-start-9">
                <Figure
                  media={norma.photos[0]}
                  reservedFor=""
                  sizes="(min-width: 64rem) 33vw, 100vw"
                />
              </div>
            )}
          </div>
        </Section>
      </Container>

      <Band tone="ink">
        <Container>
          <Section labelledBy="que-paso">
            <h2 id="que-paso" className="font-display text-title">
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
        <Section labelledBy="el-trabajo">
          {/* La foto va a la izquierda en escritorio y el texto a la derecha, al
              revés que en las otras dos secciones con foto. Se resuelve con
              colocación explícita en la grilla y no con `order`, así el texto sigue
              primero en el documento: en el teléfono el título tiene que aparecer
              antes que la imagen que ilustra. */}
          <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg lg:items-end">
            <div className="lg:col-span-5 lg:col-start-8">
              <SectionHeading title={ui.home.workStartedHeading} id="el-trabajo" />
              <p className="max-w-measure text-body">{ui.home.workStartedLead}</p>
            </div>

            {workPhoto === null ? null : (
              <div className="lg:col-span-6 lg:col-start-1 lg:row-start-1">
                <Figure
                  media={workPhoto}
                  reservedFor=""
                  sizes="(min-width: 64rem) 50vw, 100vw"
                />
              </div>
            )}
          </div>
        </Section>
      </Container>

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

          <SectionHeading
            title={ui.home.howItsGoing}
            level={3}
            className="mt-4xl"
            id="como-va"
          />

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

          <p className="mt-2xl">
            <InlineLink href={localizedHref("/reconstruccion", locale)}>
              {ui.home.rebuildDetail}
            </InlineLink>
          </p>
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
        </Section>
      </Container>

      <Container>
        <Section labelledBy="preguntas">
          <SectionHeading title={ui.home.faqHeading} id="preguntas" />
          <FaqSection locale={locale} />
        </Section>
      </Container>

      <Container>
        <Section id="compartir" tight className="border-t border-rule">
          <h2 className="font-display text-heading">{ui.home.shareHeading}</h2>
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
