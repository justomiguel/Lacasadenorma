import { DonationBoard } from "@/components/campaign/donation-board";
import { HelpWays } from "@/components/campaign/help-ways";
import { ShareBlock } from "@/components/campaign/share-block";
import { Callout } from "@/components/design-system/callout";
import { Container, Editorial, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import type { Locale } from "@/src/i18n/locale";
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

export function HelpScreen({ locale }: { locale: Locale }) {
  const { help, site, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={help.title} lead={help.lead} />

      <Container>
        <Section>
          <Editorial
            aside={
              <Callout tone="warning" title={ui.helpPage.beforeTransferTitle}>
                <p>{ui.helpPage.beforeTransfer}</p>
              </Callout>
            }
          >
            <Paragraphs items={help.paragraphs} />
          </Editorial>
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="formas">
          <SectionHeading title={ui.home.helpKicker} id="formas" />
          <HelpWays help={help} ui={ui} origen="ayudar" />
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="donaciones" id="donaciones">
          <SectionHeading title={ui.home.donateTitle} id="cuentas" />
          <DonationBoard help={help} ui={ui} />
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="despues">
          <SectionHeading title={ui.helpPage.afterHeading} id="despues" />
          <Paragraphs items={help.afterTransfer} />
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-display text-heading">{ui.helpPage.shareHeading}</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
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
