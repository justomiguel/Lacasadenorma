import { InlineLink } from "@/components/design-system/actions";
import { Callout } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export function riachoMetadata(locale: Locale) {
  const { riachoConecta, ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: riachoConecta.title,
    description: ui.riachoPage.seoDescription,
    path: "/riacho-conecta",
  });
}

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
export function RiachoScreen({ locale }: { locale: Locale }) {
  const { riachoConecta, site, ui } = getContent(locale);

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
          <SectionHeading title={ui.riachoPage.topicsHeading} id="temas" />

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

          <Callout tone="neutral" title={ui.riachoPage.noSignupTitle} className="mt-2xl">
            <p>
              {ui.riachoPage.noSignup}{" "}
              <InlineLink href={localizedHref("/novedades", locale)}>
                {ui.riachoPage.newsLink}
              </InlineLink>{" "}
              {ui.riachoPage.noSignupTail}
            </p>
          </Callout>
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">{ui.riachoPage.whereHeading}</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            {fill(ui.riachoPage.whereLead, {
              locality: site.place.locality,
              province: site.place.province,
              country: site.place.country,
            })}{" "}
            <InlineLink href={localizedHref("/legado", locale)}>
              {ui.riachoPage.legacyLink}
            </InlineLink>
            .
          </p>
        </Section>
      </Container>
    </>
  );
}
