import { Container, Section } from "@/components/design-system/layout";
import { Paragraphs } from "@/components/design-system/typography";
import { PageHeader } from "@/components/site/page-header";
import type { LegalContent } from "@/content/schema";
import { formatLongDate } from "@/components/design-system/dates";
import { intlLocale, type Locale } from "@/src/i18n/locale";

/**
 * Privacidad y términos comparten forma: un encabezado, una entrada y secciones
 * numeradas con una regla entre cada una.
 *
 * Las dos páginas legales se leen distinto de las demás: nadie las lee de arriba a
 * abajo, se busca una sección. Por eso cada sección tiene su `id` derivado del
 * encabezado, para que se pueda enlazar una parte concreta, y por eso la fecha de
 * actualización está arriba y no en el pie: en un documento legal, la fecha es
 * parte del contenido.
 */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function LegalDocument({
  document,
  updatedOn,
  locale,
  legalLabel,
  lastUpdatedLabel,
}: {
  document: LegalContent["privacy"] | LegalContent["terms"];
  updatedOn: string;
  locale: Locale;
  legalLabel: string;
  lastUpdatedLabel: string;
}) {
  const formattedDate = formatLongDate(updatedOn, intlLocale(locale));

  return (
    <>
      <PageHeader label={legalLabel} title={document.title} lead={document.lead}>
        <p className="mt-lg font-ui text-small text-ink-muted">
          {lastUpdatedLabel} <time dateTime={updatedOn}>{formattedDate}</time>
        </p>
      </PageHeader>

      <Container>
        <Section>
          <Paragraphs items={document.paragraphs} size="lead" />

          <div className="mt-3xl space-y-2xl">
            {document.sections.map((section) => {
              const id = slugify(section.heading);

              return (
                <section
                  key={id}
                  aria-labelledby={id}
                  className="border-t border-rule pt-lg"
                >
                  <h2 id={id} className="font-prose text-heading">
                    {section.heading}
                  </h2>
                  <Paragraphs items={section.paragraphs} className="mt-md" />
                </section>
              );
            })}
          </div>
        </Section>
      </Container>
    </>
  );
}
