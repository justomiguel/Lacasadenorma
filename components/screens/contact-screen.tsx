import { ContactActions } from "@/components/campaign/contact-actions";
import { HelpCta } from "@/components/campaign/help-cta";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export function contactMetadata(locale: Locale) {
  const { ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: ui.contactPage.title,
    description: ui.contactPage.seoDescription,
    path: "/contacto",
  });
}

/**
 * Contacto publicado: Saúl, WhatsApp y teléfono. No hay formulario: el sitio
 * no pide datos (docs/privacy.md).
 */
export function ContactScreen({ locale }: { locale: Locale }) {
  const { help, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={ui.contactPage.title} lead={ui.contactPage.lead} />

      <Container>
        <Section>
          <ContactActions
            name={help.contact.name}
            phoneDisplay={help.contact.phoneDisplay}
            phoneTel={help.contact.phoneTel}
            whatsappLabel={ui.contactPage.whatsapp}
            callLabel={ui.contactPage.call}
            origen="contacto"
          />

          <div className="mt-2xl max-w-measure">
            <h2 className="font-display text-heading">{ui.home.debrisTitle}</h2>
            <p className="mt-md text-body text-ink-muted">{ui.home.debrisBody}</p>
          </div>

          <div className="mt-2xl">
            <Paragraphs items={help.paragraphs} />
          </div>

          <div className="mt-2xl">
            <HelpCta
              origen="contacto"
              href={localizedHref("/ayudar", locale)}
              label={`${ui.helpCta} →`}
            />
          </div>
        </Section>
      </Container>
    </>
  );
}
