import type { Metadata } from "next";
import { describe, expect, it } from "vitest";

import { catalogMetadata } from "@/components/screens/catalog-screen";
import { contactMetadata } from "@/components/screens/contact-screen";
import { donateMetadata } from "@/components/screens/donate-screen";
import { helpMetadata } from "@/components/screens/help-screen";
import { legacyMetadata } from "@/components/screens/legacy-screen";
import { legalMetadata } from "@/components/screens/legal-screen";
import { newsIndexMetadata } from "@/components/screens/news-index-screen";
import { normaMetadata } from "@/components/screens/norma-screen";
import { paypalReturnMetadata } from "@/components/screens/paypal-return-screen";
import { reconstructionMetadata } from "@/components/screens/reconstruction-screen";
import { transparencyMetadata } from "@/components/screens/transparency-screen";
import { wallMetadata } from "@/components/screens/wall-screen";
import { whatHappenedMetadata } from "@/components/screens/what-happened-screen";
import { getContent } from "@/content";
import type { Locale } from "@/src/i18n/locale";

import { rootMetadata } from "./metadata";
import {
  parseShareRuta,
  resolveShareCopy,
  shareCardUrl,
  shareCopy,
  shareCopyForUpdate,
  truncateForCard,
} from "./share-copy";

const LOCALES: readonly Locale[] = ["es", "en"];

describe("parseShareRuta", () => {
  it("deja la canónica castellana y saca el prefijo inglés", () => {
    expect(parseShareRuta("/que-paso")).toBe("/que-paso");
    expect(parseShareRuta("/norma")).toBe("/norma");
    expect(parseShareRuta("/en/norma")).toBe("/norma");
    expect(parseShareRuta("https://ejemplo.test/en/ayudar")).toBe("/ayudar");
  });

  it("una ruta que no es del sitio no se pinta: vuelve a la home", () => {
    expect(parseShareRuta("/norma/../../etc/passwd")).toBe("/");
    expect(parseShareRuta("<script>")).toBe("/");
    expect(parseShareRuta("/Phishing")).toBe("/");
    expect(parseShareRuta("")).toBe("/");
  });
});

describe("shareCopy", () => {
  it("el título y la descripción coinciden con los de la página, en los dos idiomas", () => {
    const { site } = getContent("es");

    const cases: ReadonlyArray<{
      path: string;
      meta: (locale: Locale) => Metadata;
    }> = [
      { path: "/norma", meta: normaMetadata },
      { path: "/que-paso", meta: whatHappenedMetadata },
      { path: "/reconstruccion", meta: reconstructionMetadata },
      { path: "/catalogo", meta: catalogMetadata },
      { path: "/quienes-ayudaron", meta: wallMetadata },
      { path: "/ayudar", meta: helpMetadata },
      { path: "/ayudar/dinero", meta: donateMetadata },
      {
        path: "/ayudar/paypal/completada",
        meta: (l) => paypalReturnMetadata(l, "completed"),
      },
      {
        path: "/ayudar/paypal/cancelada",
        meta: (l) => paypalReturnMetadata(l, "cancelled"),
      },
      { path: "/contacto", meta: contactMetadata },
      { path: "/transparencia", meta: transparencyMetadata },
      { path: "/novedades", meta: newsIndexMetadata },
      { path: "/legado", meta: legacyMetadata },
      { path: "/legales/privacidad", meta: (l) => legalMetadata(l, "privacy") },
      { path: "/legales/terminos", meta: (l) => legalMetadata(l, "terms") },
    ];

    for (const locale of LOCALES) {
      for (const { path, meta } of cases) {
        const copy = shareCopy(path, locale);
        const metadata = meta(locale);

        expect(copy.description, `${path} (${locale})`).toBe(metadata.description);
        expect(metadata.openGraph?.title, `${path} (${locale})`).toBe(
          `${copy.title} — ${getContent(locale).site.name}`,
        );
      }
    }

    const home = shareCopy("/", "es");

    expect(home.title).toBe(site.name);
    expect(home.description).toBe(rootMetadata("es").description);
    expect(home.kicker).toBe(`${site.place.locality}, ${site.place.province}`);
  });

  it("una ruta desconocida no toma el texto del atacante: usa la home", () => {
    const home = shareCopy("/", "es");
    const fake = shareCopy("/soy-el-banco", "es");

    expect(fake).toEqual(home);
  });

  it("una novedad sin lookup no inventa el extracto: usa el índice", () => {
    expect(shareCopy("/novedades/una-nota-que-no-existe", "es")).toEqual(
      shareCopy("/novedades", "es"),
    );
  });
});

describe("shareCopyForUpdate", () => {
  it("el título es el de la novedad y la descripción, el extracto", () => {
    const copy = shareCopyForUpdate(
      {
        title: "Se compraron las chapas",
        body: "El 3 de septiembre se compraron las chapas del techo.",
      },
      "es",
    );

    expect(copy.title).toBe("Se compraron las chapas");
    expect(copy.description).toBe(
      "El 3 de septiembre se compraron las chapas del techo.",
    );
    expect(copy.kicker).toBe(getContent("es").site.name);
  });
});

describe("resolveShareCopy", () => {
  it("si la novedad existe, la tarjeta lleva su título; si no, el del índice", async () => {
    const found = await resolveShareCopy(
      "/novedades/se-compraron-las-chapas",
      "es",
      async () => ({
        title: "Se compraron las chapas",
        body: "Llegaron las chapas.",
      }),
    );
    const missing = await resolveShareCopy("/novedades/no-esta", "es", async () => null);

    expect(found.title).toBe("Se compraron las chapas");
    expect(missing).toEqual(shareCopy("/novedades", "es"));
  });
});

describe("shareCardUrl", () => {
  it("la URL sólo lleva ruta canónica e idioma, no el título", () => {
    expect(shareCardUrl("/norma", "es")).toBe("/compartir/tarjeta?ruta=%2Fnorma&lang=es");
    expect(shareCardUrl("/en/norma", "en")).toBe(
      "/compartir/tarjeta?ruta=%2Fnorma&lang=en",
    );
  });
});

describe("truncateForCard", () => {
  it("no corta un texto que entra, y no parte una palabra", () => {
    expect(truncateForCard("Corto.", 20)).toBe("Corto.");
    expect(truncateForCard("Una frase un poco más larga de lo que cabe", 20)).toBe(
      "Una frase un poco…",
    );
  });
});
