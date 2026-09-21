import { HelpCta } from "@/components/campaign/help-cta";
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
 * La página nombra una intención, no una entidad. No hay datos estructurados de
 * `Organization` acá: declarar una organización con datos que no existen sería
 * la clase de markup engañoso que la spec prohíbe.
 *
 * Tenía dos cosas más y las dos se fueron en ADR-024. Una era una sección con el
 * primer programa y un enlace a `/riacho-conecta`, que publicaba un temario de ocho
 * materias sin respaldo. La otra era un espacio reservado para una foto de Norma
 * en la radio que la guía de contenido marca como «si existe».
 */
export function LegacyScreen({ locale }: { locale: Locale }) {
  const { legacy, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={legacy.title} lead={legacy.lead} />

      <Container>
        <Section>
          <Paragraphs items={legacy.paragraphs} />
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
