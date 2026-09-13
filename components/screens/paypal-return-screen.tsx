import { HelpCta } from "@/components/campaign/help-cta";
import { SecondaryAction } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

export type PaypalReturnKind = "completed" | "cancelled";

const PATH = {
  completed: "/ayudar/paypal/completada",
  cancelled: "/ayudar/paypal/cancelada",
} as const;

export function paypalReturnMetadata(locale: Locale, kind: PaypalReturnKind) {
  const { ui } = getContent(locale);
  const copy = ui.paypalReturn[kind];

  return pageMetadata({
    locale,
    title: copy.title,
    description: copy.seoDescription,
    path: PATH[kind],
    noIndex: true,
  });
}

/**
 * Destino de PayPal después de un intento de aporte.
 *
 * No lee la query string: `amt`, `tx` y el resto no son un comprobante ni un
 * total publicado. El sitio no cobra (ADR-006); estas páginas sólo dicen qué
 * pasó con *este* intento y a dónde ir después.
 */
export function PaypalReturnScreen({
  locale,
  kind,
}: {
  locale: Locale;
  kind: PaypalReturnKind;
}) {
  const { ui } = getContent(locale);
  const copy = ui.paypalReturn[kind];

  return (
    <>
      <PageHeader title={copy.title} lead={copy.lead} />

      <Container>
        <Section>
          <Paragraphs items={copy.paragraphs} />

          <div className="mt-2xl">
            {kind === "cancelled" ? (
              <HelpCta
                origen="paypal-cancelada"
                href={localizedHref("/ayudar", locale)}
                label={`${copy.cta} →`}
              />
            ) : (
              <SecondaryAction href={localizedHref("/", locale)}>
                {copy.cta}
              </SecondaryAction>
            )}
          </div>
        </Section>
      </Container>
    </>
  );
}
