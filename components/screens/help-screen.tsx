import { HelpPaths } from "@/components/campaign/help-paths";
import { ShareBlock } from "@/components/campaign/share-block";
import { WallPreview } from "@/components/catalog/wall-preview";
import { Band, Container, Section } from "@/components/design-system/layout";
import { SectionHeading } from "@/components/design-system/typography";
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
 * Cómo ayudar: tres caminos a la vista (ADR-045).
 *
 * El CTA «Ayudar a reconstruir» llega acá. Ir, donar plata y traer lo que
 * falta se leen enteros, sin pestañas. El dinero, el contacto y el catálogo
 * viven en sus propias páginas.
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
            <HelpPaths locale={locale} ui={ui} className="mt-xl" />
          </Section>
        </Container>
      </Band>

      <Container>
        <Section className="border-t border-rule">
          <WallPreview locale={locale} entries={wallEntries} />
        </Section>
      </Container>

      <Container>
        <Section labelledBy="compartir">
          <SectionHeading title={ui.helpPage.shareHeading} id="compartir" rule={false} />
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
        </Section>
      </Container>
    </>
  );
}
