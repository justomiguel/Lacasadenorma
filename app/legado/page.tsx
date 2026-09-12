import { HelpCta } from "@/components/campaign/help-cta";
import { InlineLink } from "@/components/design-system/actions";
import { Callout } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { ReservedSpace } from "@/components/design-system/photo";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { legacy, riachoConecta } from "@/content";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * Fundación Norma.
 *
 * Esta es la página donde es más fácil mentir, así que es la que lleva el aviso
 * más explícito. La fundación **no existe** como persona jurídica, y la página lo
 * dice en un aviso visible, no en una nota al pie: alguien que lee "fundación"
 * asume estatuto, personería y deducción impositiva, y ninguna de las tres cosas
 * es cierta hoy.
 *
 * Por la misma razón no hay datos estructurados de `Organization` acá: declarar una
 * organización con datos que no existen sería justamente la clase de dato
 * estructurado engañoso que la spec prohíbe.
 */
export const metadata = pageMetadata({
  title: legacy.title,
  description:
    "Qué se propone Fundación Norma cuando la casa esté terminada, en qué estado está hoy el proyecto y qué es Riacho Conecta.",
  path: "/legado",
});

export default function LegadoPage() {
  return (
    <>
      <PageHeader title={legacy.title} lead={legacy.lead} />

      <Container>
        <Section>
          <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg">
            <div className="lg:col-span-7">
              <Paragraphs items={legacy.paragraphs} />

              <Callout tone="neutral" title="En qué estado está" className="mt-2xl">
                <p>
                  Fundación Norma es una intención, no una entidad. No tiene personería
                  jurídica, ni estatuto, ni CUIT, ni cuenta propia. Los aportes de hoy van
                  a la reconstrucción de la casa y se rinden en{" "}
                  <InlineLink href="/transparencia">la página de cuentas</InlineLink>.
                  Cuando la fundación exista de verdad, esta página va a decirlo con los
                  papeles a la vista.
                </p>
              </Callout>
            </div>

            <div className="lg:col-span-4 lg:col-start-9">
              <ReservedSpace
                ratio="portrait"
                description="Acá va una foto de Norma en la radio, la que explica de dónde viene todo esto."
              />
            </div>
          </div>
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="primer-programa">
          <SectionHeading title={riachoConecta.title} id="primer-programa" />
          <Paragraphs items={riachoConecta.paragraphs.slice(0, 1)} />
          <p className="mt-lg">
            <InlineLink href="/riacho-conecta">
              Ver los temas de Riacho Conecta
            </InlineLink>
          </p>
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">Primero, la casa</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            Nada de esto empieza antes de que la familia tenga dónde vivir. Ese es el
            trabajo de ahora.
          </p>
          <div className="mt-lg">
            <HelpCta origen="legado" />
          </div>
        </Section>
      </Container>
    </>
  );
}
