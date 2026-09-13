import { StructuredData } from "@/components/site/structured-data";
import { getContent } from "@/content";
import { fill } from "@/src/i18n/fill";
import type { Locale } from "@/src/i18n/locale";
import { pageMetadata } from "@/src/infrastructure/seo/metadata";
import {
  breadcrumbSchema,
  graph,
  personSchema,
  webPageSchema,
} from "@/src/infrastructure/seo/structured-data";
import { getSiteUrl } from "@/src/infrastructure/site-url";

import { BibliotecaChapter } from "./norma/biblioteca";
import { NormaBook } from "./norma/book";
import { NormaClosing } from "./norma/closing";
import { DetrasChapter } from "./norma/detras";
import { FamiliaChapter } from "./norma/familia";
import { FotografiaChapter } from "./norma/fotografia";
import { NormaHero } from "./norma/hero";
import { MujerChapter } from "./norma/mujer";
import { NoticiasChapter } from "./norma/noticias";
import { PioneraChapter } from "./norma/pionera";
import { NormaQuotes } from "./norma/quotes";
import { ReconocimientoChapter } from "./norma/reconocimiento";

export function normaMetadata(locale: Locale) {
  const { norma, ui } = getContent(locale);
  const title = fill(ui.normaPage.title, { name: norma.fullName });

  return pageMetadata({
    locale,
    title,
    description: ui.normaPage.seoDescription,
    path: "/norma",
    ...(norma.portrait === null
      ? {}
      : {
          image: {
            url: norma.portrait.url,
            width: norma.portrait.width,
            height: norma.portrait.height,
            alt: norma.portrait.alt,
          },
        }),
  });
}

/**
 * Capítulo editorial de Norma. El PDF familiar es la fuente; no hay
 * testimonios inventados ni fotos que la familia no haya entregado.
 */
export function NormaScreen({ locale }: { locale: Locale }) {
  const { norma, site, ui } = getContent(locale);
  const siteUrl = getSiteUrl();
  const title = fill(ui.normaPage.title, { name: norma.fullName });
  const [
    pionera,
    noticias,
    detras,
    fotografia,
    biblioteca,
    reconocimiento,
    mujer,
    familia,
  ] = norma.chapters;

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

      <NormaHero norma={norma} ui={ui} />
      {pionera === undefined ? null : <PioneraChapter chapter={pionera} />}
      {noticias === undefined ? null : <NoticiasChapter chapter={noticias} />}
      {detras === undefined ? null : (
        <DetrasChapter
          chapter={detras}
          retrato={norma.photos[0]}
          flores={norma.photos[1]}
        />
      )}
      {fotografia === undefined ? null : <FotografiaChapter chapter={fotografia} />}
      {biblioteca === undefined ? null : <BibliotecaChapter chapter={biblioteca} />}
      {reconocimiento === undefined ? null : (
        <ReconocimientoChapter chapter={reconocimiento} />
      )}
      {mujer === undefined ? null : <MujerChapter chapter={mujer} />}
      {familia === undefined ? null : (
        <FamiliaChapter chapter={familia} photosNote={ui.normaPage.photosNote} />
      )}
      <NormaQuotes quotes={norma.quotes} heading={ui.normaPage.quotesHeading} />
      <NormaBook book={norma.book} ui={ui} />
      <NormaClosing
        locale={locale}
        norma={norma}
        site={site}
        siteUrl={siteUrl}
        title={title}
        ui={ui}
      />
    </>
  );
}
