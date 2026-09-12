import { HelpCta } from "@/components/campaign/help-cta";
import { Band, Container, Section } from "@/components/design-system/layout";
import { PhotoSequence } from "@/components/design-system/photo";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
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

export function ReconstructionScreen({ locale }: { locale: Locale }) {
  const { reconstruction, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={reconstruction.title} lead={reconstruction.lead} />

      <Container>
        <Section tight>
          <Paragraphs items={reconstruction.paragraphs} />
        </Section>
      </Container>

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
        <Section tight className="border-t border-rule">
          <h2 className="font-display text-heading">
            {ui.reconstructionPage.helpHeading}
          </h2>
          <div className="mt-lg">
            <HelpCta
              origen="reconstruccion"
              href={localizedHref("/ayudar", locale)}
              label={`${ui.helpCta} →`}
            />
          </div>
        </Section>
      </Container>
    </>
  );
}
