import { HelpCta } from "@/components/campaign/help-cta";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function transparencyMetadata(locale: Locale) {
  const { transparency, ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: transparency.title,
    description: ui.transparencyPage.seoDescription,
    path: "/transparencia",
  });
}

/**
 * La rendición pública de cifras se rechazó. Queda el método, que es prosa
 * verificada, y el camino a ayudar. Sin widgets, sin ceros, sin «no pudimos leer».
 */
export function TransparencyScreen({ locale }: { locale: Locale }) {
  const { transparency: content, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={content.title} lead={content.lead} />

      <Container>
        <Section labelledBy="metodo">
          <SectionHeading title={ui.transparencyPage.methodHeading} id="metodo" />
          <Paragraphs items={content.method} />
          {content.paragraphs.length === 0 ? null : (
            <Paragraphs items={content.paragraphs} className="mt-lg" />
          )}
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-display text-heading">{ui.transparencyPage.helpHeading}</h2>
          <div className="mt-lg">
            <HelpCta
              origen="transparencia"
              href={localizedHref("/ayudar", locale)}
              label={`${ui.helpCta} →`}
            />
          </div>
        </Section>
      </Container>
    </>
  );
}
