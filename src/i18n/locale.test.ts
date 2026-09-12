import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  LOCALES,
  htmlLang,
  isLocale,
  localizeHref,
  ogLocale,
  stripLocalePrefix,
  switchLocaleHref,
} from "./locale";

describe("isLocale", () => {
  it("acepta los idiomas publicados y rechaza el resto", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es-AR")).toBe(false);
    expect(isLocale("en-US")).toBe(false);
    expect(isLocale("pt")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("localizeHref", () => {
  it("deja las rutas castellanas sin prefijo", () => {
    expect(localizeHref("/", "es")).toBe("/");
    expect(localizeHref("/norma", "es")).toBe("/norma");
    expect(localizeHref("/legales/privacidad", "es")).toBe("/legales/privacidad");
  });

  it("antepone /en al inglés y no duplica la barra", () => {
    expect(localizeHref("/", "en")).toBe("/en");
    expect(localizeHref("/norma", "en")).toBe("/en/norma");
    expect(localizeHref("/legales/privacidad", "en")).toBe("/en/legales/privacidad");
  });
});

describe("stripLocalePrefix", () => {
  it("saca el prefijo de idioma y deja la ruta canónica en castellano", () => {
    expect(stripLocalePrefix("/")).toBe("/");
    expect(stripLocalePrefix("/norma")).toBe("/norma");
    expect(stripLocalePrefix("/en")).toBe("/");
    expect(stripLocalePrefix("/en/norma")).toBe("/norma");
    expect(stripLocalePrefix("/en/legales/privacidad")).toBe("/legales/privacidad");
  });

  it("no confunde una ruta que empieza como un idioma", () => {
    expect(stripLocalePrefix("/entrada")).toBe("/entrada");
    expect(stripLocalePrefix("/energia")).toBe("/energia");
  });
});

describe("switchLocaleHref", () => {
  it("cambia de idioma y se queda en la misma sección", () => {
    expect(switchLocaleHref("/norma", "en")).toBe("/en/norma");
    expect(switchLocaleHref("/en/norma", "es")).toBe("/norma");
    expect(switchLocaleHref("/en", "es")).toBe("/");
    expect(switchLocaleHref("/", "en")).toBe("/en");
  });
});

describe("etiquetas para el HTML y OpenGraph", () => {
  it("usa es-AR y en, no los ids cortos, porque el lector de pantalla y WhatsApp los leen", () => {
    expect(htmlLang("es")).toBe("es-AR");
    expect(htmlLang("en")).toBe("en");
    expect(ogLocale("es")).toBe("es_AR");
    expect(ogLocale("en")).toBe("en_US");
  });

  it("el idioma por omisión es el de origen", () => {
    expect(DEFAULT_LOCALE).toBe("es");
    expect(LOCALES).toEqual(["es", "en"]);
  });
});
