import { DonationMethods } from "@/components/campaign/donation-methods";
import { ShareBlock } from "@/components/campaign/share-block";
import { Unavailable } from "@/components/campaign/unavailable";
import { Callout } from "@/components/design-system/callout";
import { InlineLink } from "@/components/design-system/actions";
import { Container, Editorial, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/content";
import { getDonationMethods } from "@/src/application/use-cases/get-donation-methods";
import { localizedHref } from "@/src/i18n/href";
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
 * Es el final del recorrido y el único lugar del sitio donde un error se paga
 * caro: si alguien transfiere a la cuenta equivocada, no se deshace. De ahí las
 * tres cosas que esta página hace y que parecen de más:
 *
 * 1. **Dice qué no hace.** No cobra, no pide datos de tarjeta, no procesa pagos.
 *    Quien llega desde un WhatsApp reenviado necesita descartar la estafa antes
 *    de mirar un CBU.
 * 2. **Advierte sobre los sitios falsos**, con la instrucción concreta de
 *    verificar el dominio. Una campaña que circula por mensajes es exactamente el
 *    caso que se clona.
 * 3. **Explica qué pasa después de transferir**, porque si el total publicado no
 *    se mueve al día siguiente, la duda razonable es si el aporte llegó.
 */
/**
 * Cinco minutos de atraso máximo para las cifras (ADR-017). Las acciones del
 * backoffice invalidan esta ruta al publicar, así que en la práctica el dato aparece
 * al instante; esto es el piso para lo que se cambie fuera del backoffice.
 */
export async function HelpScreen({ locale }: { locale: Locale }) {
  const { help, site, ui } = getContent(locale);
  const donations = await getDonationMethods({
    dataLayer: getPublicDataLayer(),
    logger,
  });

  return (
    <>
      <PageHeader title={help.title} lead={help.lead} />

      <Container>
        <Section>
          {/* La advertencia va al margen y no debajo del texto. Es el lugar donde una
              publicación pone la nota que hay que leer sin interrumpir la lectura, y en
              escritorio la columna de la derecha estaba vacía en la única página del
              sitio donde alguien está a punto de mover plata (ADR-021). */}
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
        <Section className="border-t border-rule" labelledBy="cuentas">
          <SectionHeading title={ui.helpPage.accountsHeading} id="cuentas" />

          {donations.status === "ok" ? (
            <DonationMethods
              methods={donations.data.methods}
              countries={donations.data.countries}
            />
          ) : (
            <Unavailable reason={donations.reason} copy={ui.unavailable} />
          )}
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="despues">
          <SectionHeading title={ui.helpPage.afterHeading} id="despues" />
          <Paragraphs items={help.afterTransfer} />

          <p className="mt-lg max-w-measure text-body">
            {ui.helpPage.afterLinkLead}{" "}
            <InlineLink href={localizedHref("/transparencia", locale)}>
              {ui.helpPage.reportLink}
            </InlineLink>
            {ui.helpPage.afterLinkTail}
          </p>
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
            url={`${getSiteUrl()}${localizedHref("/ayudar", locale)}`}
            route={localizedHref("/ayudar", locale)}
            title={`${site.name} — ${site.tagline}`}
            text={site.shortDescription}
          />
        </Section>
      </Container>
    </>
  );
}
