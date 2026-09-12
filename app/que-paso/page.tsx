import { HelpCta } from "@/components/campaign/help-cta";
import { InlineLink } from "@/components/design-system/actions";
import { Band, Container, Editorial, Section } from "@/components/design-system/layout";
import { PhotoSequence } from "@/components/design-system/photo";
import {
  Paragraphs,
  SectionHeading,
  Testimony,
} from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { site, whatHappened } from "@/content";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * Qué ocurrió.
 *
 * Durante un tiempo esta página decía «Norma murió en un accidente», «no vamos a
 * dar más detalles» y «esta página no lo cuenta». Era la decisión correcta cuando
 * no había un texto autorizado: la de contar o no contar es de la familia, no del
 * sitio.
 *
 * Después la familia **publicó** el relato con su firma —la fecha, la hora, qué se
 * quemó, quién murió, cómo está su marido— y entregó las fotos. Un sitio que pide
 * plata para reconstruir una casa y no dice que se incendió no puede generar
 * confianza, porque no está contando nada (ADR-021). Así que la página cuenta lo
 * que la familia contó, con sus palabras, y nada más que eso.
 *
 * El ensayo va en tramos y no en una galería: «esa noche» y «así quedó» son dos
 * momentos, y la diferencia entre los dos es lo que se está pidiendo reparar. Las
 * fotos del **trabajo** no están acá: están en `/reconstruccion`, porque la pérdida
 * se muestra una vez y en pasado, y el trabajo siempre y en presente (`ux.md` §1).
 *
 * Cierra en qué se necesita ahora. Si terminara en la pérdida, la última cosa que
 * quedaría es lástima, y la lástima no reconstruye una casa: la confianza sí.
 */
export const metadata = pageMetadata({
  title: whatHappened.title,
  description:
    "El 7 de septiembre, a las 4.30 de la mañana, un incendio destruyó la casa de la familia en Riacho He Hé. Norma falleció. Ésta es la historia, las fotos y qué se necesita ahora.",
  path: "/que-paso",
});

export default function QuePasoPage() {
  return (
    <>
      <PageHeader title={whatHappened.lead} />

      <Container>
        <Section>
          {/* La columna del margen lleva la ficha del hecho. Es el uso que `ux.md` §4
              le prometió siempre y que no tenía: dos tercios de pantalla vacíos a la
              derecha de la prosa no eran espacio en blanco editorial, eran un hueco.
              Acá el margen hace lo que hace en un impreso, que es sostener el dato
              que la prosa no repite. */}
          <Editorial
            aside={
              <dl className="border-t border-rule font-ui text-small">
                <div className="border-b border-rule py-sm">
                  <dt className="text-ink-muted">Dónde</dt>
                  <dd className="mt-3xs">
                    {site.place.locality}, {site.place.province}
                  </dd>
                </div>
                <div className="border-b border-rule py-sm">
                  <dt className="text-ink-muted">Cuándo</dt>
                  {/* Sin año, y no es un olvido: la pieza que publicó la familia
                      fecha el incendio un «lunes 7 de septiembre de 2024», y el 7 de
                      septiembre de 2024 fue sábado. El día y la hora los afirma la
                      familia y no están en duda; el año sí, así que no se publica
                      hasta que lo confirmen. Un año estimado en la fecha en que
                      murió una persona no es un dato, es una invención. */}
                  <dd className="mt-3xs">Lunes 7 de septiembre, 4.30 de la mañana</dd>
                </div>
                <div className="py-sm">
                  <dt className="text-ink-muted">Qué se perdió</dt>
                  <dd className="mt-3xs">
                    Gran parte de la vivienda y todo lo que había adentro
                  </dd>
                </div>
              </dl>
            }
          >
            <Paragraphs items={whatHappened.paragraphs} />
          </Editorial>

          {whatHappened.testimony === null ? null : (
            <Testimony
              quote={whatHappened.testimony.quote}
              author={whatHappened.testimony.author}
              relation={whatHappened.testimony.relation}
              className="mt-4xl"
            />
          )}
        </Section>
      </Container>

      {whatHappened.photoEssay.length === 0 ? null : (
        <Band tone="sunk">
          <Container>
            <Section labelledBy="las-fotos">
              <h2 id="las-fotos" className="sr-only">
                Las fotos del incendio
              </h2>
              <PhotoSequence groups={whatHappened.photoEssay} />
            </Section>
          </Container>
        </Band>
      )}

      <Container>
        <Section labelledBy="que-se-necesita">
          <SectionHeading title={whatHappened.needNow.title} id="que-se-necesita" />
          <Paragraphs items={whatHappened.needNow.paragraphs} />

          <div className="mt-2xl">
            <HelpCta origen="que-paso" />
          </div>

          <p className="mt-xl max-w-measure text-small text-ink-muted">
            Si querés ver antes en qué se va a usar la plata, está todo en{" "}
            <InlineLink href="/reconstruccion">la reconstrucción</InlineLink> y en{" "}
            <InlineLink href="/transparencia">la rendición de cuentas</InlineLink>.
          </p>
        </Section>
      </Container>
    </>
  );
}
