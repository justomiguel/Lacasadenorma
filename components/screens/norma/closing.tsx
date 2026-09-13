import { ShareBlock } from "@/components/campaign/share-block";
import { InlineLink } from "@/components/design-system/actions";
import { Band, Container, Section } from "@/components/design-system/layout";
import { Paragraphs } from "@/components/design-system/typography";
import type { PersonContent, SiteContent, UiContent } from "@/content/schema";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

export function NormaClosing({
  locale,
  norma,
  site,
  siteUrl,
  title,
  ui,
}: {
  locale: Locale;
  norma: PersonContent;
  site: SiteContent;
  siteUrl: string;
  title: string;
  ui: UiContent;
}) {
  return (
    <>
      <Band tone="forest">
        <Container>
          <Section labelledBy="puente" chapter="next">
            <div data-reveal="">
              <h2 id="puente" className="font-display text-title">
                {norma.bridge.title}
              </h2>
              <Paragraphs items={[...norma.bridge.paragraphs]} className="mt-lg" />
              <p className="mt-xl">
                <InlineLink href={localizedHref("/legado", locale)}>
                  {ui.primaryNav["/legado"].label} →
                </InlineLink>
              </p>
            </div>
          </Section>
        </Container>
      </Band>

      <Container>
        <Section tight className="border-t border-rule">
          <p className="mt-0 max-w-measure text-body text-ink-muted">
            {ui.normaPage.contribution}{" "}
            <InlineLink href={localizedHref("/legales/privacidad", locale)}>
              {ui.normaPage.privacyLink}
            </InlineLink>
            .
          </p>
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-display text-heading">{ui.normaPage.shareHeading}</h2>
          <ShareBlock
            className="mt-lg"
            url={`${siteUrl}${localizedHref("/norma", locale)}`}
            route={localizedHref("/norma", locale)}
            title={`${title} — ${site.name}`}
            text={norma.summary}
          />
        </Section>
      </Container>
    </>
  );
}
