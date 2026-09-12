import { ShareBlock } from "@/components/campaign/share-block";
import { InlineLink } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { BleedOnMobile, ReservedSpace } from "@/components/design-system/photo";
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
 * por eso es la única cuya prosa no tiene ninguna cifra al lado.
 *
 * Las fotos que eligió la familia van en el margen y sangran en teléfono, donde
 * cualquiera de ellas es más ancha que la pantalla. El único hueco que queda es el
 * de la radio, que es la foto que explica de dónde viene el proyecto y todavía no
 * apareció.
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
                {/* Sin `priority`: en teléfono la columna de fotos va después de
                    todo el relato, así que la primera está a varias pantallas del
                    pliegue. La única foto del sitio que se precarga es el retrato de
                    la apertura de la home. */}
                {norma.photos.map((photo) => (
                  <BleedOnMobile key={photo.url} media={photo} />
                ))}
                {/* Sigue faltando la que explica de dónde viene todo esto. */}
                <ReservedSpace
                  ratio="landscape"
                  description="Acá va una foto de Norma en la radio de Riacho He Hé."
                />
              </div>
              <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
                Las fotos de Norma las eligió su familia. Falta la de la radio, y ese
                espacio queda vacío hasta que aparezca: no vamos a poner una imagen de
                archivo en el lugar de una foto de ella.
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
