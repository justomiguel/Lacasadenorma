import { HelpCta } from "@/components/campaign/help-cta";
import { InlineLink } from "@/components/design-system/actions";
import { Callout } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export function legacyMetadata(locale: Locale) {
  const { legacy, ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: legacy.title,
    description: ui.legacyPage.seoDescription,
    path: "/legado",
  });
}

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
 *
 * Tenía dos cosas más y las dos se fueron en ADR-024. Una era una sección con el
 * primer programa y un enlace a `/riacho-conecta`, que publicaba un temario de ocho
 * materias sin respaldo en ninguna parte del proyecto. La otra era un espacio
 * reservado para una foto de Norma en la radio que la guía de contenido marca como
 * «si existe»: reservarle la mitad de la página a una foto que puede no llegar es
 * la promesa que `ux.md` §12 ya documentó como error. Sin las dos, la página es más
 * corta y dice lo mismo, que es todo lo que se puede afirmar.
 */
export function LegacyScreen({ locale }: { locale: Locale }) {
  const { legacy, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={legacy.title} lead={legacy.lead} />

      <Container>
        <Section>
          <Paragraphs items={legacy.paragraphs} />

          <Callout tone="neutral" title={ui.legacyPage.statusTitle} className="mt-2xl">
            <p>
              {ui.legacyPage.statusBody}{" "}
              <InlineLink href={localizedHref("/transparencia", locale)}>
                {ui.legacyPage.accountsLink}
              </InlineLink>
              {ui.legacyPage.statusTail}
            </p>
          </Callout>
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-display text-heading">{ui.legacyPage.houseFirst}</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            {ui.legacyPage.houseFirstLead}
          </p>
          <div className="mt-lg">
            <HelpCta
              origen="legado"
              href={localizedHref("/ayudar", locale)}
              label={ui.helpCta}
            />
          </div>
        </Section>
      </Container>
    </>
  );
}
