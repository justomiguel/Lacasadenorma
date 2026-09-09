import { Unavailable } from "@/components/campaign/unavailable";
import { InlineLink } from "@/components/design-system/actions";
import { EmptyState } from "@/components/design-system/callout";
import { Container, Section } from "@/components/design-system/layout";
import { Figure } from "@/components/design-system/photo";
import { Byline } from "@/components/design-system/typography";
import { listUpdates } from "@/src/application/use-cases/get-updates";
import { excerpt } from "@/src/domain/rich-text";
import { getPublicDataLayer } from "@/src/infrastructure/data-layer";
import { logger } from "@/src/infrastructure/logging/logger";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";
import { PageHeader } from "@/components/site/page-header";

/**
 * Las novedades, de la más reciente a la más antigua.
 *
 * Es un índice, no un muro de tarjetas: cada entrada es una fecha, un título y
 * dos líneas, separadas por una regla. Una foto por entrada, cuando existe, en la
 * columna angosta. Es la forma que tiene un sumario de revista y funciona igual en
 * un teléfono.
 *
 * El título de cada entrada es el enlace, no un "leer más" al final: el enlace
 * tiene que decir a dónde lleva cuando se lo escucha aislado en un lector de
 * pantalla.
 */
/**
 * Cinco minutos de atraso máximo para las cifras (ADR-017). Las acciones del
 * backoffice invalidan esta ruta al publicar, así que en la práctica el dato aparece
 * al instante; esto es el piso para lo que se cambie fuera del backoffice.
 */
export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Novedades",
  description:
    "Cada avance de la obra contado el día que pasó, con su fecha y sus fotos. Lo que se compró, lo que se hizo y lo que falta.",
  path: "/novedades",
});

export default async function NovedadesPage() {
  const updates = await listUpdates({ dataLayer: getPublicDataLayer(), logger });

  return (
    <>
      <PageHeader
        label="El diario de la obra"
        title="Novedades"
        lead="Cada avance, el día que pasó."
      />

      <Container>
        <Section>
          {updates.status !== "ok" ? (
            <Unavailable reason={updates.reason} />
          ) : updates.data.length === 0 ? (
            <EmptyState title="Todavía no hay novedades publicadas">
              <p>
                La primera va a ser el día en que empiece la obra. Mientras tanto, lo que
                ya se puede ver es{" "}
                <InlineLink href="/reconstruccion">qué hay que hacer</InlineLink> y{" "}
                <InlineLink href="/transparencia">cómo va la cuenta</InlineLink>.
              </p>
            </EmptyState>
          ) : (
            <ul className="border-t border-rule">
              {updates.data.map((update) => {
                const cover = update.media[0];

                return (
                  <li
                    key={update.id}
                    className="grid gap-lg border-b border-rule py-xl lg:grid-cols-12 lg:gap-lg"
                  >
                    <div className="lg:col-span-7">
                      {update.publishedAt === null ? null : (
                        <Byline isoDate={update.publishedAt} />
                      )}
                      <h2 className="mt-xs font-prose text-heading">
                        <InlineLink
                          href={`/novedades/${update.slug}`}
                          className="text-ink decoration-brick hover:text-brick-strong"
                        >
                          {update.title}
                        </InlineLink>
                      </h2>
                      <p className="mt-sm max-w-measure text-body text-ink-muted">
                        {excerpt(update.body, 180)}
                      </p>
                    </div>

                    {cover === undefined ? null : (
                      <div className="lg:col-span-4 lg:col-start-9">
                        <Figure
                          media={cover}
                          ratio="landscape"
                          reservedFor=""
                          sizes="(min-width: 64rem) 30vw, 100vw"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </Container>
    </>
  );
}
