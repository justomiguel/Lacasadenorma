import { HelpCta } from "@/components/campaign/help-cta";
import { InlineLink } from "@/components/design-system/actions";
import { Callout } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { ReservedSpace } from "@/components/design-system/photo";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
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
 */
export function LegacyScreen({ locale }: { locale: Locale }) {
  const { legacy, riachoConecta, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={legacy.title} lead={legacy.lead} />

      <Container>
        <Section>
          <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg">
            <div className="lg:col-span-7">
              <Paragraphs items={legacy.paragraphs} />

              <Callout
                tone="neutral"
                title={ui.legacyPage.statusTitle}
                className="mt-2xl"
              >
                <p>
                  {ui.legacyPage.statusBody}{" "}
                  <InlineLink href={localizedHref("/transparencia", locale)}>
                    {ui.legacyPage.accountsLink}
                  </InlineLink>
                  {ui.legacyPage.statusTail}
                </p>
              </Callout>
            </div>

            <div className="lg:col-span-4 lg:col-start-9">
              <ReservedSpace ratio="portrait" description={ui.legacyPage.radioReserved} />
            </div>
          </div>
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="primer-programa">
          <SectionHeading title={riachoConecta.title} id="primer-programa" />
          <Paragraphs items={riachoConecta.paragraphs.slice(0, 1)} />
          <p className="mt-lg">
            <InlineLink href={localizedHref("/riacho-conecta", locale)}>
              {ui.legacyPage.seeTopics}
            </InlineLink>
          </p>
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">{ui.legacyPage.houseFirst}</h2>
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
