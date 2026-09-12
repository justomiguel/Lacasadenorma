import { ContactActions } from "@/components/campaign/contact-actions";
import { DonationBoard } from "@/components/campaign/donation-board";
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
          <div className="grid gap-lg md:grid-cols-3">
            <article className="rounded-md border border-rule p-lg">
              <h3 className="font-display text-heading">{ui.home.debrisTitle}</h3>
              <p className="mt-md text-body text-ink-muted">{ui.home.debrisBody}</p>
              <div className="mt-lg">
                <ContactActions
                  name={help.contact.name}
                  phoneDisplay={help.contact.phoneDisplay}
                  phoneTel={help.contact.phoneTel}
                  whatsappLabel={ui.home.whatsapp}
                  callLabel={ui.home.call}
                  origen="ayudar-escombros"
                />
              </div>
            </article>
            <article className="rounded-md border border-rule p-lg">
              <h3 className="font-display text-heading">{ui.home.materialsTitle}</h3>
              <p className="mt-md text-body text-ink-muted">{ui.home.materialsBody}</p>
              <ul className="mt-md flex flex-wrap gap-xs">
                {help.materials.map((item) => (
                  <li
                    key={item}
                    className="rounded-pill bg-sage px-md py-xs font-ui text-small text-forest"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-md border border-rule p-lg">
              <h3 className="font-display text-heading">{ui.home.remoteTitle}</h3>
              <p className="mt-md text-body text-ink-muted">{ui.home.remoteBody}</p>
            </article>
          </div>
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
