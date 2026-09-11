import { HelpCta } from "@/components/campaign/help-cta";
import { InlineLink } from "@/components/design-system/actions";
import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs, SectionHeading } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import { whatHappened } from "@/content";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";

/**
 * Qué ocurrió.
 *
 * La página más corta del sitio, y a propósito. No hay detalles del accidente
 * porque no le sirven a nadie, y la decisión de contarlos o no es de la familia,
 * no del sitio.
 *
 * Cierra en qué se necesita ahora. Si terminara en la pérdida, la última cosa que
 * quedaría es lástima, y la lástima no reconstruye una casa: la confianza sí. Es
 * el recorrido que pide `ux.md` —memoria, ayuda, reconstrucción, futuro— aplicado
 * a una sola página.
 */
export const metadata = pageMetadata({
  title: whatHappened.title,
  description:
    "Norma murió en un accidente. Esta página explica lo que hace falta saber, sin detalles que no le sirven a nadie, y qué necesita la familia ahora.",
  path: "/que-paso",
});

export default function QuePasoPage() {
  return (
    <>
      <PageHeader label="Qué ocurrió" title={whatHappened.lead} />

      <Container>
        <Section>
          <Paragraphs items={whatHappened.paragraphs} />
        </Section>
      </Container>

      <Container>
        <Section className="border-t border-rule" labelledBy="que-se-necesita">
          <SectionHeading
            label="Ahora"
            title={whatHappened.needNow.title}
            id="que-se-necesita"
          />
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
