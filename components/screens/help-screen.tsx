import { HelpTabs } from "@/components/campaign/help-tabs";
import { ShareBlock } from "@/components/campaign/share-block";
import { WallPreview } from "@/components/catalog/wall-preview";
import { Band, Container, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { getDonationWall } from "@/src/application/use-cases/get-donation-wall";
import type { Locale } from "@/src/i18n/locale";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";
import { getSiteUrl } from "@/src/infrastructure/site-url";

export const revalidate = 300;

export function helpMetadata(locale: Locale) {
  const { help, ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: help.title,
    description: ui.helpPage.seoDescription,
    path: "/ayudar",
  });
}

/**
 * Cómo ayudar.
 *
 * La página tiene dos partes y cada una está sobre una superficie distinta:
 * las tres formas de ayudar como pestañas (papel hundido, es el corazón de la
 * página y la barra de ayuda del teléfono apunta acá), y qué pasa después más
 * compartir (papel).
 */
export async function HelpScreen({ locale }: { locale: Locale }) {
  const { help, site, ui } = getContent(locale);
  const wall = await getDonationWall({ dataLayer: getPublicDataLayer(), logger });
  const wallEntries = wall.status === "ok" ? wall.data : [];

  return (
    <>
      <PageHeader title={help.title} lead={help.lead} />

      <Band tone="sunk">
        <Container>
          <Section labelledBy="formas" id="donaciones" className="scroll-mt-24">
            <SectionHeading title={ui.home.helpKicker} id="formas" rule={false} />
            <HelpTabs help={help} ui={ui} origen="ayudar" />
          </Section>
        </Container>
      </Band>

      <Container>
        <Section className="border-t border-rule">
          <WallPreview locale={locale} entries={wallEntries} />
        </Section>
      </Container>

      <Container>
        <Section labelledBy="despues">
          <div className="grid gap-2xl lg:grid-cols-2 lg:gap-3xl">
            <div>
              <SectionHeading
                title={ui.helpPage.afterHeading}
                id="despues"
                rule={false}
              />
              <Paragraphs items={help.afterTransfer} />
            </div>
            <div>
              <SectionHeading title={ui.helpPage.shareHeading} rule={false} />
              <p className="max-w-measure text-body text-ink-muted">
                {ui.helpPage.shareLead}
              </p>
              <ShareBlock
                className="mt-lg"
                url={`${getSiteUrl()}${locale === "es" ? "/ayudar" : "/en/ayudar"}`}
                route="/ayudar"
                title={`${site.name} — ${help.title}`}
                text={site.shortDescription}
              />
            </div>
          </div>
        </Section>
      </Container>
    </>
  );
}
