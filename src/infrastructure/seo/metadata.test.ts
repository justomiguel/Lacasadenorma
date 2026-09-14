import { describe, expect, it } from "vitest";

import { newsIndexMetadata } from "@/components/screens/news-index-screen";

import { pageMetadata, rootMetadata } from "./metadata";
import { shareCardUrl } from "./share-copy";

describe("pageMetadata", () => {
  it("la canónica es la URL de este idioma, y los hreflang listan los dos", () => {
    const es = pageMetadata({
      locale: "es",
      title: "Norma",
      description: "Quién fue Norma Edith Bedoya y qué dejó hecho en Riacho He Hé.",
      path: "/norma",
    });

    expect(es.alternates?.canonical).toBe("/norma");
    expect(es.alternates?.languages).toEqual({
      "es-AR": "/norma",
      en: "/en/norma",
      "x-default": "/norma",
    });
    expect(es.openGraph?.locale).toBe("es_AR");
    expect(es.openGraph?.alternateLocale).toEqual(["en_US"]);
    expect(es.openGraph?.images).toEqual([
      expect.objectContaining({
        url: shareCardUrl("/norma", "es"),
        width: 1200,
        height: 630,
      }),
    ]);
  });

  it("la previa al compartir es la tarjeta del símbolo, no una foto de la página", () => {
    const meta = pageMetadata({
      locale: "es",
      title: "El legado",
      description: "La intención futura, todavía sin organización constituida.",
      path: "/legado",
    });

    expect(meta.openGraph?.images).toEqual([
      expect.objectContaining({ url: shareCardUrl("/legado", "es") }),
    ]);
    expect(JSON.stringify(meta.openGraph?.images)).not.toContain("/fotos/");
  });

  it("una novedad con portada se comparte con esa imagen, no con la tarjeta", () => {
    const cover = {
      url: "https://ejemplo.test/storage/v1/object/public/fotos/obra-f10.jpg",
      alt: "La colada, de un extremo al otro",
      width: 1920,
      height: 1080,
    };
    const meta = pageMetadata({
      locale: "es",
      title: "Empezó el techo",
      description: "Llegaron las chapas y se apoyaron sobre los muros.",
      path: "/novedades/empezo-el-techo",
      image: cover,
    });

    expect(meta.openGraph?.images).toEqual([
      expect.objectContaining({
        url: cover.url,
        width: cover.width,
        height: cover.height,
        alt: cover.alt,
      }),
    ]);
    expect(meta.twitter?.images).toEqual([cover.url]);
    expect(JSON.stringify(meta.openGraph?.images)).not.toContain("/compartir/tarjeta");
  });

  it("noIndex apaga el rastreo sin sacar la canónica", () => {
    const meta = pageMetadata({
      locale: "es",
      title: "Gracias",
      description: "Gracias por el aporte a la reconstrucción de la casa de la familia.",
      path: "/ayudar/paypal/completada",
      noIndex: true,
    });

    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBe("/ayudar/paypal/completada");
  });

  it("en inglés la canónica lleva el prefijo y x-default sigue siendo el castellano", () => {
    const en = pageMetadata({
      locale: "en",
      title: "Norma",
      description: "Who Norma Edith Bedoya was and what she left done in Riacho He Hé.",
      path: "/norma",
    });

    expect(en.alternates?.canonical).toBe("/en/norma");
    expect(en.alternates?.languages).toEqual({
      "es-AR": "/norma",
      en: "/en/norma",
      "x-default": "/norma",
    });
    expect(en.openGraph?.locale).toBe("en_US");
    expect(en.openGraph?.alternateLocale).toEqual(["es_AR"]);
    expect(en.openGraph?.images).toEqual([
      expect.objectContaining({ url: shareCardUrl("/norma", "en") }),
    ]);
  });

  it("el índice de novedades declara el feed RSS", () => {
    const meta = newsIndexMetadata("es");

    expect(meta.alternates?.types).toEqual({
      "application/rss+xml": "/novedades.xml",
    });
  });
});

describe("rootMetadata", () => {
  it("la home inglesa no mueve la canónica castellana", () => {
    expect(rootMetadata("es").alternates?.canonical).toBe("/");
    expect(rootMetadata("en").alternates?.canonical).toBe("/en");
    expect(rootMetadata("en").alternates?.languages).toEqual({
      "es-AR": "/",
      en: "/en",
      "x-default": "/",
    });
  });

  it("la home también declara la tarjeta del símbolo", () => {
    const es = rootMetadata("es");

    expect(es.openGraph?.images).toEqual([
      expect.objectContaining({ url: shareCardUrl("/", "es") }),
    ]);
    expect(es.twitter?.images).toEqual([shareCardUrl("/", "es")]);
  });
});
