import { describe, expect, it } from "vitest";

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
