import { describe, expect, it } from "vitest";

import { pageMetadata, rootMetadata } from "./metadata";

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
});
