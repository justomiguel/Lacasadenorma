import { DonationMethods } from "@/components/campaign/donation-methods";
import { ShareBlock } from "@/components/campaign/share-block";
import { Unavailable } from "@/components/campaign/unavailable";
import { Callout } from "@/components/design-system/callout";
import { InlineLink } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { help, site } from "@/content";
import { getDonationMethods } from "@/src/application/use-cases/get-donation-methods";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";
import { getSiteUrl } from "@/src/infrastructure/site-url";

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
export const revalidate = 300;

export const metadata = pageMetadata({
  title: help.title,
  description:
    "Datos para transferir desde Argentina, Chile o Estados Unidos. Esta página no cobra ni pide datos de tarjeta: los aportes van por transferencia bancaria.",
  path: "/ayudar",
});

export default async function AyudarPage() {
  const donations = await getDonationMethods({
    dataLayer: getPublicDataLayer(),
    logger,
  });

  return (
    <>
      <PageHeader title={help.title} lead={help.lead} />

      <Container>
        <Section>
          <Paragraphs items={help.paragraphs} />

          <Callout tone="warning" title="Antes de transferir" className="mt-2xl">
            <p>
              Verificá que estés en el dominio correcto. Si los datos bancarios que ves no
              coinciden con los que difundimos por nuestros canales, no transfieras. Nunca
              vamos a pedirte una clave, un código de tu banco ni los datos de tu tarjeta.
            </p>
          </Callout>
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="cuentas">
          <SectionHeading title="Elegí desde dónde transferís" id="cuentas" />

          {donations.status === "ok" ? (
            <DonationMethods
              methods={donations.data.methods}
              countries={donations.data.countries}
            />
          ) : (
            <Unavailable reason={donations.reason} />
          )}
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="despues">
          <SectionHeading title="Qué pasa cuando transferís" id="despues" />
          <Paragraphs items={help.afterTransfer} />

          <p className="mt-lg max-w-measure text-body">
            Todo lo que entra y todo lo que sale está en{" "}
            <InlineLink href="/transparencia">la rendición de cuentas</InlineLink>, con la
            fecha de la última conciliación a la vista.
          </p>
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">Otra forma de ayudar</h2>
          <p className="mt-sm max-w-measure text-body text-ink-muted">
            Si no podés aportar, compartir el enlace ayuda igual. La mayoría de la gente
            que llegó hasta acá lo hizo porque alguien se lo pasó.
          </p>
          <ShareBlock
            className="mt-lg"
            url={`${getSiteUrl()}/ayudar`}
            route="/ayudar"
            title={`${site.name} — ${site.tagline}`}
            text={site.shortDescription}
          />
        </Section>
      </Container>
    </>
  );
}
