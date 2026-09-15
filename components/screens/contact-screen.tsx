import { ContactActions } from "@/components/campaign/contact-actions";
import { HelpCta } from "@/components/campaign/help-cta";
import { BrandLabel } from "@/components/design-system/brand-mark";
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
 * Contacto publicado: Justo Miguel Vargas, WhatsApp, correo, Instagram, y el
 * mapa del pueblo (ADR-045). No hay formulario: el sitio no pide datos
 * (docs/privacy.md). El mapa es un enlace a Google Maps, no un iframe.
 */
export function ContactScreen({ locale }: { locale: Locale }) {
  const { help, site, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={ui.contactPage.title} lead={ui.contactPage.lead} />

      <Container>
        <Section>
          <ContactActions
            name={help.contact.name}
            photo={help.contact.photo}
            phoneDisplay={help.contact.phoneDisplay}
            phoneTel={help.contact.phoneTel}
            email={help.contact.email}
            instagram={help.contact.instagram}
            whatsappLabel={ui.contactPage.whatsapp}
            callLabel={ui.contactPage.call}
            emailLabel={ui.contactPage.email}
            instagramLabel={ui.contactPage.instagram}
            origen="contacto"
          />

          <div className="mt-2xl max-w-measure">
            <h2 className="font-display text-heading">{ui.contactPage.mapsHeading}</h2>
            <p className="mt-md text-body text-ink-muted">{ui.contactPage.mapsLead}</p>
            <p className="mt-sm font-ui text-body">
              {site.place.locality}, {site.place.province}
            </p>
            <a
              href={help.contact.mapsUrl}
              rel="noopener noreferrer"
              target="_blank"
              className="mt-lg inline-flex min-h-touch items-center gap-xs font-ui text-body font-medium text-forest transition-colors duration-fast hover:text-forest-strong"
            >
              <BrandLabel id="google">{ui.contactPage.mapsCta}</BrandLabel>
            </a>
          </div>

          <div className="mt-2xl max-w-measure">
            <h2 className="font-display text-heading">{ui.home.debrisTitle}</h2>
            <p className="mt-md text-body text-ink-muted">{ui.home.debrisBody}</p>
          </div>

          {help.paragraphs.length === 0 ? null : (
            <div className="mt-2xl">
              <Paragraphs items={help.paragraphs} />
            </div>
          )}

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
