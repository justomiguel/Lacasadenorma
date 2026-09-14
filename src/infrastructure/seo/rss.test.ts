import { describe, expect, it } from "vitest";

import { renderNewsRss } from "./rss";

const channel = {
  siteName: "La Casa de Norma",
  siteUrl: "https://ejemplo.test",
  channelTitle: "Novedades",
  channelDescription: "Cada avance de la obra contado el día que pasó.",
};

describe("renderNewsRss", () => {
  it("lista de la más nueva a la más vieja y no inventa HTML del cuerpo", () => {
    const xml = renderNewsRss({
      ...channel,
      items: [
        {
          title: "Empezó el techo",
          slug: "empezo-el-techo",
          publishedAt: "2026-09-06T12:00:00.000Z",
          body: "Llegaron las **chapas**.\n\n![cabriadas](media:11111111-1111-4111-8111-111111111111)",
        },
        {
          title: "Se retiraron los escombros",
          slug: "se-retiraron-los-escombros",
          publishedAt: "2026-08-17T12:00:00.000Z",
          body: "El terreno quedó libre.",
        },
      ],
    });

    expect(xml).toContain("<title>Empezó el techo</title>");
    expect(xml).toContain("https://ejemplo.test/novedades/empezo-el-techo");
    expect(xml.indexOf("empezo-el-techo")).toBeLessThan(
      xml.indexOf("se-retiraron-los-escombros"),
    );
    expect(xml).toContain("Llegaron las chapas.");
    expect(xml).not.toContain("**chapas**");
    expect(xml).not.toContain("cabriadas");
    expect(xml).toContain("<language>es-AR</language>");
  });

  it("un título con & y < no abre un tag", () => {
    const xml = renderNewsRss({
      ...channel,
      items: [
        {
          title: "Chapas A & B <stock>",
          slug: "chapas",
          publishedAt: "2026-09-06T12:00:00.000Z",
          body: "Compradas.",
        },
      ],
    });

    expect(xml).toContain("Chapas A &amp; B &lt;stock&gt;");
    expect(xml).not.toContain("<stock>");
  });

  it("un canal sin entradas sigue siendo RSS, no un error", () => {
    const xml = renderNewsRss({ ...channel, items: [] });

    expect(xml).toContain('<rss version="2.0">');
    expect(xml).not.toContain("<item>");
  });

  it("un ítem sin fecha no inventa pubDate", () => {
    const xml = renderNewsRss({
      ...channel,
      items: [
        {
          title: "Sin fecha",
          slug: "sin-fecha",
          publishedAt: null,
          body: "No debería pasar: el puerto público filtra.",
        },
      ],
    });

    expect(xml).not.toContain("<pubDate>");
  });
});
