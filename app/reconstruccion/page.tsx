import { BudgetList } from "@/components/campaign/budget-list";
import { HelpCta } from "@/components/campaign/help-cta";
import { CampaignProgress } from "@/components/campaign/progress";
import { Unavailable } from "@/components/campaign/unavailable";
import { EmptyState } from "@/components/design-system/callout";
import { Band, Container, Section } from "@/components/design-system/layout";
import { PhotoSequence, ReservedSpace } from "@/components/design-system/photo";
import { Timeline } from "@/components/design-system/timeline";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { reconstruction } from "@/content";
import { getCampaignOverview } from "@/src/application/use-cases/get-campaign-overview";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

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
export const revalidate = 300;

export const metadata = pageMetadata({
  title: reconstruction.title,
  description:
    "Qué hay que reconstruir en la casa, el presupuesto por rubro con los montos ya cotizados, los hitos de la obra y el avance publicado.",
  path: "/reconstruccion",
});

export default async function ReconstruccionPage() {
  const overview = await getCampaignOverview({
    dataLayer: getPublicDataLayer(),
    logger,
  });

  return (
    <>
      <PageHeader title={reconstruction.title} lead={reconstruction.lead} />

      <Container>
        <Section>
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
              <SectionHeading title="El trabajo hasta ahora" id="el-trabajo" />
              <PhotoSequence groups={reconstruction.photoEssay} />
            </Section>
          </Container>
        </Band>
      )}

      {reconstruction.scope.length === 0 ? null : (
        <Container>
          <Section className="border-t border-rule" labelledBy="alcance">
            <SectionHeading title="Qué hay que hacer" id="alcance" />
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
          <SectionHeading title="Cuánto sale cada rubro" id="presupuesto" />
          {overview.status === "ok" ? (
            <BudgetList items={overview.data.budgetItems} />
          ) : (
            <Unavailable reason={overview.reason} />
          )}
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="avance">
          <SectionHeading title="Cómo va la obra" id="avance" />

          {overview.status === "ok" ? (
            <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg">
              <div className="lg:col-span-7">
                <CampaignProgress
                  fundraising={overview.data.fundraising}
                  milestones={overview.data.milestones}
                  reconciledAt={overview.data.transparency.reconciledAt}
                  reconciliationIsStale={overview.data.transparency.reconciliationIsStale}
                />

                {overview.data.milestones.totalCount === 0 ? (
                  <EmptyState title="Todavía no hay hitos publicados" className="mt-2xl">
                    <p>
                      Los hitos se cargan cuando la obra tiene un plan con etapas. Hasta
                      entonces no hay una línea de tiempo que mostrar, y una vacía no
                      diría nada.
                    </p>
                  </EmptyState>
                ) : (
                  <Timeline
                    milestones={overview.data.milestones.milestones}
                    className="mt-2xl"
                  />
                )}
              </div>

              <aside className="lg:col-span-4 lg:col-start-9">
                <ReservedSpace
                  ratio="landscape"
                  description="Acá van las fotos del avance de la obra, con su fecha."
                />
                <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
                  Las fotos del avance se publican junto con cada novedad, así que cada
                  una queda fechada y se puede compartir por separado.
                </p>
              </aside>
            </div>
          ) : (
            <Unavailable reason={overview.reason} />
          )}
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">Ayudar con la obra</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            Cada aporte se registra y cada gasto se publica. Podés ver los dos números en
            la misma página.
          </p>
          <div className="mt-lg">
            <HelpCta origen="reconstruccion" />
          </div>
        </Section>
      </Container>
    </>
  );
}
