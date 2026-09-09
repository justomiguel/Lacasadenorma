import { BudgetList } from "@/components/campaign/budget-list";
import { DonationMethods } from "@/components/campaign/donation-methods";
import { FaqSection } from "@/components/campaign/faq-section";
import { HelpCta } from "@/components/campaign/help-cta";
import { Hero } from "@/components/campaign/hero";
import { CampaignProgress } from "@/components/campaign/progress";
import { ShareBlock } from "@/components/campaign/share-block";
import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink, SecondaryAction } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { ReservedSpace } from "@/components/design-system/photo";
import { Stat, StatGroup } from "@/components/design-system/figures";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { StructuredData } from "@/components/site/structured-data";
import { legacy, norma, reconstruction, site, whatHappened } from "@/content";
import { getCampaignOverview } from "@/src/application/use-cases/get-campaign-overview";
import { getDonationMethods } from "@/src/application/use-cases/get-donation-methods";
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
 * La home responde las nueve preguntas del proyecto en el orden en que una
 * persona las hace, y las responde **en el HTML servido**: nada importante
 * aparece después de un click, de un acordeón o de una carga en el cliente. Es lo
 * que hace que sirva igual para una persona apurada, para un buscador y para un
 * agente, que es el mismo requisito visto desde tres lados.
 *
 * Las cifras salen de un único caso de uso. Cinco lecturas independientes darían
 * cinco oportunidades de mostrar una parte y omitir otra sin motivo visible.
 */
export default async function HomePage() {
  const dataLayer = getPublicDataLayer();

  const [overview, donations] = await Promise.all([
    getCampaignOverview({ dataLayer, logger }),
    getDonationMethods({ dataLayer, logger }),
  ]);

  const siteUrl = getSiteUrl();

  return (
    <>
      {/* `FAQPage` es legítimo acá y sólo acá: las nueve preguntas están visibles
          más abajo en esta misma página, con la misma redacción. */}
      <StructuredData
        json={graph([
          webPageSchema({
            siteUrl,
            path: "/",
            name: `${site.name} — ${site.tagline}`,
            description: site.shortDescription,
          }),
          faqSchema(),
          donateActionSchema(siteUrl),
        ])}
      />

      <Hero />

      {/* 2. Quién fue Norma */}
      <Container>
        <Section labelledBy="quien-fue">
          <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg">
            <div className="lg:col-span-7">
              <SectionHeading label="Quién fue" title="Norma" id="quien-fue" />
              <Paragraphs items={norma.paragraphs} />
              <p className="mt-lg">
                <InlineLink href="/norma">Leer la historia completa</InlineLink>
              </p>
            </div>

            <div className="lg:col-span-4 lg:col-start-9">
              <ReservedSpace
                ratio="landscape"
                description="Acá va una foto de Norma trabajando en la radio."
              />
            </div>
          </div>
        </Section>
      </Container>

      {/* 3. Qué pasó */}
      <Container>
        <Section labelledBy="que-paso">
          <SectionHeading label="Qué ocurrió" title={whatHappened.lead} id="que-paso" />
          <Paragraphs items={whatHappened.paragraphs} />
          <p className="mt-lg">
            <InlineLink href="/que-paso">Leer qué ocurrió</InlineLink>
          </p>
        </Section>
      </Container>

      {/* 4. Qué hay que reconstruir */}
      <Container>
        <Section labelledBy="reconstruir">
          <SectionHeading
            label="La obra"
            title="Qué hay que reconstruir"
            id="reconstruir"
          />
          <Paragraphs items={reconstruction.paragraphs} />

          {overview.status === "ok" ? (
            <BudgetList items={overview.data.budgetItems} className="mt-xl" />
          ) : (
            <Unavailable reason={overview.reason} className="mt-xl" />
          )}

          <p className="mt-lg">
            <InlineLink href="/reconstruccion">Ver el detalle de la obra</InlineLink>
          </p>
        </Section>
      </Container>

      {/* 5. Cómo va */}
      <Container>
        <Section labelledBy="como-va">
          <SectionHeading label="El avance" title="Cómo va" id="como-va" />

          {overview.status === "ok" ? (
            <CampaignProgress
              fundraising={overview.data.fundraising}
              milestones={overview.data.milestones}
              reconciledAt={overview.data.transparency.reconciledAt}
              reconciliationIsStale={overview.data.transparency.reconciliationIsStale}
            />
          ) : (
            <Unavailable reason={overview.reason} />
          )}
        </Section>
      </Container>

      {/* 6. Cómo ayudar. Los datos se copian desde acá: SC-002 pide tres toques
          como máximo desde que se abre la página. */}
      <Container>
        <Section labelledBy="como-ayudar">
          <SectionHeading label="Colaborar" title="Cómo ayudar" id="como-ayudar" />

          {donations.status === "ok" ? (
            <DonationMethods
              methods={donations.data.methods}
              countries={donations.data.countries}
            />
          ) : (
            <Unavailable reason={donations.reason} />
          )}

          <div className="mt-2xl flex flex-col items-start gap-lg sm:flex-row sm:items-center">
            <HelpCta origen="seccion-ayudar" label="Ver los datos completos" />
            <SecondaryAction href="/transparencia">Ver en qué se usó</SecondaryAction>
          </div>
        </Section>
      </Container>

      {/* 7. En qué se usó */}
      <Container>
        <Section labelledBy="en-que-se-uso">
          <SectionHeading label="Rendición" title="En qué se usó" id="en-que-se-uso" />

          {overview.status === "ok" ? (
            <>
              <StatGroup>
                <Stat
                  label="Recibido"
                  amount={overview.data.transparency.primary.received}
                />
                <Stat label="Gastado" amount={overview.data.transparency.primary.spent} />
                <Stat label="Saldo" amount={overview.data.transparency.primary.balance} />
              </StatGroup>
              <p className="mt-xl max-w-measure text-body">
                Cada gasto está publicado con su fecha, su concepto y la indicación de si
                tiene comprobante. Los totales de arriba son la suma de ese detalle, no un
                número escrito a mano.{" "}
                <InlineLink href="/transparencia">Ver la rendición completa</InlineLink>
              </p>
            </>
          ) : (
            <Unavailable reason={overview.reason} />
          )}
        </Section>
      </Container>

      {/* 8. Qué sigue */}
      <Container>
        <Section labelledBy="que-sigue">
          <SectionHeading label="Lo que sigue" title={legacy.lead} id="que-sigue" />
          <Paragraphs items={legacy.paragraphs.slice(0, 2)} />
          <p className="mt-lg">
            <InlineLink href="/legado">Conocer Fundación Norma</InlineLink>
            {" · "}
            <InlineLink href="/riacho-conecta">Ver Riacho Conecta</InlineLink>
          </p>
        </Section>
      </Container>

      {/* 9. Preguntas */}
      <Container>
        <Section labelledBy="preguntas">
          <SectionHeading
            label="Preguntas"
            title="Lo que suelen preguntarnos"
            id="preguntas"
          />
          <FaqSection />
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">Compartir la campaña</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            La mayoría de la gente va a llegar acá porque alguien le pasó el enlace. Si
            podés, pasalo vos.
          </p>
          <ShareBlock
            className="mt-lg"
            url={siteUrl}
            route="/"
            title={`${site.name} — ${site.tagline}`}
            text={site.shortDescription}
          />
        </Section>
      </Container>
    </>
  );
}
