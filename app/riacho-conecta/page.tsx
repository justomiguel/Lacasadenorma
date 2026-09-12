import { InlineLink } from "@/components/design-system/actions";
import { Callout } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { riachoConecta, site } from "@/content";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * Riacho Conecta: los temas del programa.
 *
 * Los temas son una lista numerada y no una grilla de tarjetas con ícono. Ocho
 * tarjetas idénticas con un ícono genérico cada una es exactamente el patrón que
 * el proyecto no quiere, y además dirían menos: acá la lista es el contenido.
 *
 * No hay formulario de inscripción, y su ausencia es deliberada. Pedir un correo
 * para "avisarte cuando abra" crearía una base de datos de personas para un
 * programa sin fecha, y el principio de privacidad es no recolectar lo que no se
 * necesita todavía.
 */
export const metadata = pageMetadata({
  title: riachoConecta.title,
  description:
    "Formación gratuita en herramientas digitales en Riacho He Hé: los temas que se proponen cubrir y en qué estado está el programa.",
  path: "/riacho-conecta",
});

export default function RiachoConectaPage() {
  return (
    <>
      <PageHeader title={riachoConecta.title} lead={riachoConecta.lead} />

      <Container>
        <Section>
          <Paragraphs items={riachoConecta.paragraphs} />
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="temas">
          <SectionHeading title="Los temas" id="temas" />

          <ol className="max-w-measure border-t border-rule">
            {riachoConecta.topics.map((topic, index) => (
              <li
                key={topic}
                className="flex items-baseline gap-md border-b border-rule py-sm"
              >
                {/* Ordinal decorativo: números tabulares sí, `data-figure` no. Ese
                    atributo marca las cifras que el proyecto afirma, y la suite sin
                    datos verifica que no haya ninguna. */}
                <span
                  className="font-ui text-small tabular-nums text-ink-faint"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-body">{topic}</span>
              </li>
            ))}
          </ol>

          <Callout tone="neutral" title="Todavía no hay inscripción" className="mt-2xl">
            <p>
              No hay fechas ni cupos, así que no hay nada a lo que anotarse. Cuando el
              programa tenga calendario se publica en{" "}
              <InlineLink href="/novedades">las novedades</InlineLink> y en esta misma
              página. No pedimos tu correo para avisarte: preferimos no guardar datos de
              gente para algo que todavía no existe.
            </p>
          </Callout>
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">Dónde queda</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            {site.place.locality} es una localidad del departamento Pilcomayo, en{" "}
            {site.place.province}, {site.place.country}. El programa se piensa para dar
            clases ahí, no para invitar a la gente a irse.{" "}
            <InlineLink href="/legado">Cómo encaja en Fundación Norma</InlineLink>.
          </p>
        </Section>
      </Container>
    </>
  );
}
