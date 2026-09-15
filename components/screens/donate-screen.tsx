import { DonationSelector } from "@/components/campaign/donation-selector";
import { Band, Container, Section } from "@/components/design-system/layout";
import { SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export const revalidate = 300;

export function donateMetadata(locale: Locale) {
  const { ui } = getContent(locale);

  return pageMetadata({
    locale,
    title: ui.helpPage.moneyTitle,
    description: ui.helpPage.moneySeoDescription,
    path: "/ayudar/dinero",
  });
}

/**
 * Donar dinero: Argentina, Chile, el resto del mundo (ADR-032, ADR-045).
 *
 * El tablero de donaciones ya no vive en `/ayudar`. Esta página es el segundo
 * toque después de elegir «Donar dinero». Argentina está elegida de entrada,
 * así que copiar el CBU son tres toques desde la home (SC-002).
 */
export function DonateScreen({ locale }: { locale: Locale }) {
  const { help, ui } = getContent(locale);

  return (
    <>
      <PageHeader title={ui.helpPage.moneyTitle} lead={ui.helpPage.moneyLead} />

      <Band tone="sunk">
        <Container>
          <Section labelledBy="cuentas" id="donaciones" className="scroll-mt-24">
            <SectionHeading
              title={ui.helpPage.accountsHeading}
              id="cuentas"
              rule={false}
            />
            <DonationSelector help={help} ui={ui} />
            <DonationConfirmation
              heading={ui.helpPage.afterHeading}
              paragraphs={help.afterTransfer}
              note={ui.home.thanksNote}
              className="mt-xl"
            />
          </Section>
        </Container>
      </Band>
    </>
  );
}

/**
 * Qué pasa después de aportar. No hay comprobante ni recibo que mostrar: el
 * sitio no cobra. Lo que sí se dice es que no hace falta avisar, y gracias.
 */
function DonationConfirmation({
  heading,
  paragraphs,
  note,
  className,
}: {
  heading: string;
  paragraphs: readonly string[];
  note: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="font-display text-heading">{heading}</h2>
      {paragraphs.map((text) => (
        <p
          key={text.slice(0, 48)}
          className="mt-md max-w-measure text-small text-ink-muted"
        >
          {text}
        </p>
      ))}
      <p className="mt-md max-w-measure font-hand text-hand text-olive">{note}</p>
    </div>
  );
}
