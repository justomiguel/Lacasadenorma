import { ShareBlock } from "@/components/campaign/share-block";
import { InlineLink } from "@/components/design-system/actions";
import { Band, Container, Section } from "@/components/design-system/layout";
import { CoverPhoto, Figure } from "@/components/design-system/photo";
import { Paragraphs } from "@/components/design-system/typography";
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

function Chapter({
  title,
  kicker,
  paragraphs,
  id,
}: {
  kicker: string | null;
  title: string;
  paragraphs: readonly string[];
  id: string;
}) {
  return (
    <div data-reveal="">
      {kicker === null ? null : (
        <p
          data-kicker=""
          className="font-ui text-label uppercase tracking-label text-olive"
        >
          {kicker}
        </p>
      )}
      <h2 id={id} className="whitespace-pre-line font-display text-title">
        {title}
      </h2>
      <Paragraphs items={[...paragraphs]} className="mt-lg" />
    </div>
  );
}

/**
 * Capítulo editorial de Norma. El documento familiar es la fuente; no hay
 * testimonios inventados ni fotos que la familia no haya entregado.
 */
export function NormaScreen({ locale }: { locale: Locale }) {
  const { norma, site, ui } = getContent(locale);
  const siteUrl = getSiteUrl();
  const title = fill(ui.normaPage.title, { name: norma.fullName });
  const pionera = norma.chapters[0];
  const noticias = norma.chapters[1];
  const detras = norma.chapters[2];
  const biblioteca = norma.chapters[3];
  const reconocimiento = norma.chapters[4];
  const mujer = norma.chapters[5];
  const retrato = norma.photos[0];
  const flores = norma.photos[1];

  return (
    <>
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

      <header className="bg-paper">
        <Container className="pb-3xl pt-3xl lg:pb-5xl lg:pt-5xl">
          <div className="grid items-end gap-3xl lg:grid-cols-12">
            <div className="lg:col-span-7" data-reveal="">
              <p
                data-kicker=""
                className="font-ui text-label uppercase tracking-label text-olive"
              >
                {ui.home.chapterNorma}
              </p>
              <h1
                id="norma"
                className="mt-md max-w-quote whitespace-pre-line font-display text-display"
              >
                {norma.openingTitle}
              </h1>
              <p className="mt-xl max-w-measure text-lead">{norma.summary}</p>
              <p className="mt-lg max-w-measure text-body text-ink-muted">
                {norma.paragraphs[0]}
              </p>
            </div>
            {norma.portrait === null ? null : (
              <div className="lg:col-span-4 lg:col-start-9">
                <div data-reveal-photo="wipe" className="overflow-hidden rounded-md">
                  <Figure
                    media={norma.portrait}
                    reservedFor=""
                    showCaption={false}
                    sizes="(min-width: 64rem) 32vw, 90vw"
                  />
                </div>
              </div>
            )}
          </div>
        </Container>
      </header>

      {pionera === undefined ? null : (
        <Container>
          <Section labelledBy="pionera" chapter="norma">
            <Chapter
              id="pionera"
              kicker={pionera.kicker}
              title={pionera.title}
              paragraphs={pionera.paragraphs}
            />
          </Section>
        </Container>
      )}

      {noticias === undefined ? null : (
        <Band tone="sunk">
          <Container>
            <Section labelledBy="noticias" chapter="norma">
              <div className="grid items-center gap-2xl lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <Chapter
                    id="noticias"
                    kicker={noticias.kicker}
                    title={noticias.title}
                    paragraphs={noticias.paragraphs}
                  />
                </div>
                {retrato === undefined ? null : (
                  <div className="lg:col-span-4 lg:col-start-9">
                    <div
                      data-reveal-photo="wipe-x"
                      className="overflow-hidden rounded-md"
                    >
                      <Figure
                        media={retrato}
                        reservedFor=""
                        showCaption={false}
                        sizes="(min-width: 64rem) 28vw, 90vw"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </Container>
        </Band>
      )}

      {detras === undefined ? null : (
        <Band tone="forest">
          <Container>
            <Section labelledBy="detras" chapter="norma">
              <div data-reveal="" className="max-w-quote">
                <h2 id="detras" className="whitespace-pre-line font-display text-display">
                  {detras.title}
                </h2>
                <Paragraphs items={[...detras.paragraphs]} className="mt-xl" />
              </div>
            </Section>
          </Container>
        </Band>
      )}

      {biblioteca === undefined ? null : (
        <Container>
          <Section labelledBy="biblioteca" chapter="norma">
            <Chapter
              id="biblioteca"
              kicker={biblioteca.kicker}
              title={biblioteca.title}
              paragraphs={biblioteca.paragraphs}
            />
          </Section>
        </Container>
      )}

      {reconocimiento === undefined ? null : (
        <Band tone="sunk">
          <Container>
            <Section labelledBy="reconocimiento" chapter="norma">
              <article className="max-w-measure border border-rule bg-paper px-lg py-xl lg:px-xl">
                <Chapter
                  id="reconocimiento"
                  kicker={reconocimiento.kicker}
                  title={reconocimiento.title}
                  paragraphs={reconocimiento.paragraphs}
                />
              </article>
            </Section>
          </Container>
        </Band>
      )}

      {mujer === undefined ? null : (
        <Container>
          <Section labelledBy="mujer" chapter="norma">
            <div className="grid items-start gap-2xl lg:grid-cols-12">
              <div className="lg:col-span-6">
                <Chapter
                  id="mujer"
                  kicker={mujer.kicker}
                  title={mujer.title}
                  paragraphs={mujer.paragraphs}
                />
                {norma.quotes.length === 0 ? null : (
                  <ul className="mt-2xl space-y-2xl">
                    {norma.quotes.map((entry) => (
                      <li key={entry.quote}>
                        <blockquote className="font-display text-heading italic">
                          {entry.quote}
                        </blockquote>
                        <p className="mt-md font-ui text-small text-ink-muted">
                          {entry.author}
                          <span className="block">{entry.relation}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-lg lg:col-span-5 lg:col-start-8">
                {flores === undefined ? null : (
                  <div className="relative aspect-[3/2] overflow-hidden rounded-md">
                    <CoverPhoto
                      media={flores}
                      quality={68}
                      sizes="(min-width: 64rem) 32vw, 90vw"
                      position="center 40%"
                    />
                  </div>
                )}
                <p className="max-w-measure font-ui text-small text-ink-muted">
                  {ui.normaPage.photosNote}
                </p>
              </div>
            </div>
          </Section>
        </Container>
      )}

      <Band tone="forest">
        <Container>
          <Section labelledBy="puente" chapter="next">
            <div data-reveal="">
              <h2 id="puente" className="font-display text-title">
                {norma.bridge.title}
              </h2>
              <Paragraphs items={[...norma.bridge.paragraphs]} className="mt-lg" />
              <p className="mt-xl">
                <InlineLink href={localizedHref("/legado", locale)}>
                  {ui.primaryNav["/legado"].label} →
                </InlineLink>
              </p>
            </div>
          </Section>
        </Container>
      </Band>

      <Container>
        <Section tight className="border-t border-rule">
          <p className="mt-0 max-w-measure text-body text-ink-muted">
            {ui.normaPage.contribution}{" "}
            <InlineLink href={localizedHref("/legales/privacidad", locale)}>
              {ui.normaPage.privacyLink}
            </InlineLink>
            .
          </p>
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
