import { BudgetList } from "@/components/campaign/budget-list";
import { HelpCta } from "@/components/campaign/help-cta";
import { CampaignProgress } from "@/components/campaign/progress";
import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { Band, Container, Section } from "@/components/design-system/layout";
import { PhotoSequence } from "@/components/design-system/photo";
import { Timeline } from "@/components/design-system/timeline";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { getCampaignOverview } from "@/src/application/use-cases/get-campaign-overview";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function reconstructionMetadata(locale: Locale) {
  const { reconstruction, ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: reconstruction.title,
    description: ui.reconstructionPage.seoDescription,
    path: "/reconstruccion",
  });
}

/**
 * La reconstrucción: qué hay que hacer, cuánto sale y cómo va.
 *
 * El alcance de la obra en prosa vive en `content/reconstruccion.json` y los
 * montos en `budget_items`, separados a propósito (ADR-007): la explicación de qué
 * hay que arreglar la escribe la familia una vez, y el monto de cada rubro cambia
 * cada vez que llega un presupuesto. Mezclarlos obligaría a editar un archivo del
 * repositorio para actualizar una cifra.
 */
/**
 * Cinco minutos de atraso máximo para las cifras (ADR-017). Las acciones del
 * backoffice invalidan esta ruta al publicar, así que en la práctica el dato aparece
 * al instante; esto es el piso para lo que se cambie fuera del backoffice.
 */
export async function ReconstructionScreen({ locale }: { locale: Locale }) {
  const { reconstruction, ui } = getContent(locale);
  const overview = await getCampaignOverview({
    dataLayer: getPublicDataLayer(),
    logger,
  });

  return (
    <>
      <PageHeader title={reconstruction.title} lead={reconstruction.lead} />

      {/* `tight`: son dos párrafos de introducción, y con el ritmo largo quedaban
          solos en la primera pantalla de escritorio con la banda de fotos abajo del
          pliegue. Lo que tiene que ver quien llega acá es el trabajo. */}
      <Container>
        <Section tight>
          <Paragraphs items={reconstruction.paragraphs} />
        </Section>
      </Container>

      {/* El trabajo hecho hasta ahora. Va antes del presupuesto a propósito: quien
          está decidiendo si transferir quiere ver que la obra existe antes de leer
          cuánto sale. Y es el lado «así está hoy» del par que empieza en
          `/que-paso` (ADR-021). */}
      {reconstruction.photoEssay.length === 0 ? null : (
        <Band tone="sunk">
          <Container>
            <Section labelledBy="el-trabajo">
              <SectionHeading title={ui.reconstructionPage.workHeading} id="el-trabajo" />
              <PhotoSequence groups={reconstruction.photoEssay} />
            </Section>
          </Container>
        </Band>
      )}

      {reconstruction.scope.length === 0 ? null : (
        <Container>
          <Section className="border-t border-rule" labelledBy="alcance">
            <SectionHeading title={ui.reconstructionPage.scopeHeading} id="alcance" />
            <dl className="border-t border-rule">
              {reconstruction.scope.map((item) => (
                <div key={item.title} className="border-b border-rule py-md">
                  <dt className="text-body font-medium">{item.title}</dt>
                  <dd className="mt-3xs max-w-measure text-body text-ink-muted">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </Container>
      )}

      <Container>
        <Section className="border-t border-rule" labelledBy="presupuesto">
          <SectionHeading title={ui.reconstructionPage.budgetHeading} id="presupuesto" />
          {overview.status === "ok" ? (
            <BudgetList items={overview.data.budgetItems} locale={locale} ui={ui} />
          ) : (
            <Unavailable reason={overview.reason} copy={ui.unavailable} />
          )}
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="avance">
          <SectionHeading title={ui.reconstructionPage.progressHeading} id="avance" />

          {overview.status === "ok" ? (
            <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg">
              <div className="lg:col-span-7">
                <CampaignProgress
                  fundraising={overview.data.fundraising}
                  milestones={overview.data.milestones}
                  reconciledAt={overview.data.transparency.reconciledAt}
                  reconciliationIsStale={overview.data.transparency.reconciliationIsStale}
                  locale={locale}
                  ui={ui}
                />

                {overview.data.milestones.totalCount === 0 ? (
                  <EmptyState
                    title={ui.reconstructionPage.noMilestonesTitle}
                    className="mt-2xl"
                  >
                    <p>{ui.reconstructionPage.noMilestonesBody}</p>
                  </EmptyState>
                ) : (
                  <Timeline
                    milestones={overview.data.milestones.milestones}
                    className="mt-2xl"
                  />
                )}
              </div>

              {/* Acá había un rectángulo vacío que decía «acá van las fotos del avance».
                  Se fue: la página ya muestra el trabajo hecho más arriba, y el hueco
                  reservado prometía por segunda vez algo que llega por otro camino. Las
                  fotos del avance se publican con cada novedad, fechadas, y el lugar
                  donde se ven es `/novedades` (ADR-021, criterio 11). */}
              <aside className="lg:col-span-4 lg:col-start-9">
                <p className="max-w-measure border-t border-rule pt-md font-ui text-small text-ink-muted">
                  {ui.reconstructionPage.photosNote}
                </p>
                <p className="mt-md">
                  <InlineLink href={localizedHref("/novedades", locale)}>
                    {ui.reconstructionPage.seeNews}
                  </InlineLink>
                </p>
              </aside>
            </div>
          ) : (
            <Unavailable reason={overview.reason} copy={ui.unavailable} />
          )}
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">{ui.reconstructionPage.helpHeading}</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            {ui.reconstructionPage.helpLead}
          </p>
          <div className="mt-lg">
            <HelpCta
              origen="reconstruccion"
              href={localizedHref("/ayudar", locale)}
              label={ui.helpCta}
            />
          </div>
        </Section>
      </Container>
    </>
  );
}
