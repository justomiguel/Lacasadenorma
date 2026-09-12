import { HelpCta } from "@/components/campaign/help-cta";
import { SecondaryAction } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * 404 del mockup: misma voz, sin inventar una página de campaña.
 */
export function NotFoundScreen({ locale }: { locale: Locale }) {
  const { ui } = getContent(locale);

  return (
    <>
      <PageHeader title={ui.notFoundPage.title} lead={ui.notFoundPage.lead} />

      <Container>
        <Section tight>
          <div className="flex flex-col items-start gap-md sm:flex-row sm:items-center">
            <SecondaryAction href={localizedHref("/", locale)}>
              {ui.notFoundPage.home}
            </SecondaryAction>
            <HelpCta
              origen="404"
              href={localizedHref("/ayudar", locale)}
              label={`${ui.helpCta} →`}
            />
          </div>
        </Section>
      </Container>
    </>
  );
}
