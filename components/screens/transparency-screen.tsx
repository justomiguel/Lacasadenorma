import { HelpCta } from "@/components/campaign/help-cta";
import { TransparencyReport } from "@/components/campaign/transparency-report";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { keepStaleOnError } from "@/src/application/result";
import { getTransparencyReport } from "@/src/application/use-cases/get-transparency-report";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
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
 * Rendición pública: el método, y los porcentajes sobre lo ya conocido.
 * Sin montos. El 100% de la obra no está publicado (ADR-040).
 */
export async function TransparencyScreen({ locale }: { locale: Locale }) {
  const { transparency: content, ui } = getContent(locale);
  const report = keepStaleOnError(
    await getTransparencyReport({
      dataLayer: getPublicDataLayer(),
      logger,
    }),
  );

  return (
    <>
      <PageHeader title={content.title} lead={content.lead} />

      {report.status === "ok" && !report.data.summary.isEmpty ? (
        <Container>
          <Section labelledBy="composicion">
            <SectionHeading title={ui.transparencyPage.totalsHeading} id="composicion" />
            <TransparencyReport
              summary={report.data.summary}
              budgetItems={report.data.budgetItems}
              locale={locale}
              ui={ui}
            />
          </Section>
        </Container>
      ) : null}

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
