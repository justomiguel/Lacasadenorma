import { ShareBlock } from "@/components/campaign/share-block";
import { InlineLink } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { ReservedSpace } from "@/components/design-system/photo";
import { Paragraphs } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { StructuredData } from "@/components/site/structured-data";
import { norma, site } from "@/content";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";
import {
  breadcrumbSchema,
  graph,
  personSchema,
  webPageSchema,
} from "@/src/infrastructure/seo/structured-data";
import { getSiteUrl } from "@/src/infrastructure/site-url";

/**
 * La historia de Norma.
 *
 * Es la página que hace que el proyecto sea de una persona y no de una causa, y
 * por eso es la única cuya prosa no tiene ninguna cifra al lado. Cuando exista el
 * ensayo fotográfico va acá; mientras no exista, los huecos mantienen su
 * proporción y dicen qué foto va en cada uno.
 */
export const metadata = pageMetadata({
  title: `Quién fue ${norma.fullName}`,
  description: norma.summary,
  path: "/norma",
});

export default function NormaPage() {
  const siteUrl = getSiteUrl();

  return (
    <>
      {/* `Person` sin `birthDate` ni `deathDate`: el contenido los tiene en nulo
          porque la familia no los publicó, y una fecha aproximada no es una fecha. */}
      <StructuredData
        json={graph([
          webPageSchema({
            siteUrl,
            path: "/norma",
            name: `Quién fue ${norma.fullName}`,
            description: norma.summary,
          }),
          personSchema(siteUrl),
          breadcrumbSchema(siteUrl, [
            { name: "Inicio", path: "/" },
            { name: `Quién fue ${norma.fullName}`, path: "/norma" },
          ]),
        ])}
      />

      <PageHeader
        label={norma.roleLabel}
        title={`Quién fue ${norma.fullName}`}
        lead={norma.summary}
      />

      <Container>
        <Section>
          <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg">
            <div className="lg:col-span-7">
              <Paragraphs items={norma.paragraphs} />

              <p className="mt-2xl max-w-measure text-body text-ink-muted">
                Si la conociste y querés que algo de esto figure en su historia, la
                familia lo va a escuchar. Todavía no hay una dirección publicada para eso;
                cuando la haya, va a estar acá y en la{" "}
                <InlineLink href="/legales/privacidad">página de privacidad</InlineLink>.
              </p>
            </div>

            <aside className="lg:col-span-4 lg:col-start-9">
              <div className="space-y-lg">
                <ReservedSpace
                  ratio="portrait"
                  description="Acá va el retrato de Norma que elija la familia."
                />
                <ReservedSpace
                  ratio="landscape"
                  description="Acá va una foto de Norma en la radio de Riacho He Hé."
                />
              </div>
              <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
                Las fotografías las está reuniendo la familia. Hasta que lleguen, estos
                espacios quedan vacíos: no vamos a poner una imagen de archivo en el lugar
                de una foto de ella.
              </p>
            </aside>
          </div>
        </Section>
      </Container>

      <Container>
        <Section tight className="border-t border-rule">
          <h2 className="font-prose text-heading">Compartir su historia</h2>
          <ShareBlock
            className="mt-lg"
            url={`${siteUrl}/norma`}
            route="/norma"
            title={`Quién fue ${norma.fullName} — ${site.name}`}
            text={norma.summary}
          />
        </Section>
      </Container>
    </>
  );
}
