import { ShareBlock } from "@/components/campaign/share-block";
import { InlineLink } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { BleedOnMobile } from "@/components/design-system/photo";
import { Paragraphs } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { StructuredData } from "@/components/site/structured-data";
import { getContent } from "@/content";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";
import {
  breadcrumbSchema,
  graph,
  personSchema,
  webPageSchema,
} from "@/src/infrastructure/seo/structured-data";
import { getSiteUrl } from "@/src/infrastructure/site-url";

export function normaMetadata(locale: Locale) {
  const { norma, ui } = getContent(locale);
  const title = fill(ui.normaPage.title, { name: norma.fullName });

  return pageMetadata({
    locale,
    title,
    description: ui.normaPage.seoDescription,
    path: "/norma",
  });
}

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
export function NormaScreen({ locale }: { locale: Locale }) {
  const { norma, site, ui } = getContent(locale);
  const siteUrl = getSiteUrl();
  const title = fill(ui.normaPage.title, { name: norma.fullName });

  return (
    <>
      {/* `Person` sin `birthDate` ni `deathDate`: el contenido los tiene en nulo
          porque la familia no los publicó, y una fecha aproximada no es una fecha. */}
      <StructuredData
        json={graph([
          webPageSchema({
            siteUrl,
            path: "/norma",
            name: title,
            description: norma.summary,
            locale,
          }),
          personSchema(siteUrl, locale),
          breadcrumbSchema(
            siteUrl,
            [
              { name: ui.homeLabel, path: "/" },
              { name: title, path: "/norma" },
            ],
            locale,
          ),
        ])}
      />

      <PageHeader label={norma.roleLabel} title={title} lead={norma.summary} />

      <Container>
        <Section>
          <div className="grid gap-2xl lg:grid-cols-12 lg:gap-lg">
            <div className="lg:col-span-7">
              <Paragraphs items={norma.paragraphs} />

              <p className="mt-2xl max-w-measure text-body text-ink-muted">
                {ui.normaPage.contribution}{" "}
                <InlineLink href={localizedHref("/legales/privacidad", locale)}>
                  {ui.normaPage.privacyLink}
                </InlineLink>
                .
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
              </div>
              <p className="mt-md max-w-measure font-ui text-small text-ink-muted">
                {ui.normaPage.photosNote}
              </p>
            </aside>
          </div>
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
