import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";

import { HelpPaths } from "./help-paths";

const { ui } = getContent("es");

describe("HelpPaths", () => {
  it("los tres caminos están en el HTML servido, cada uno con su destino", () => {
    const html = renderToStaticMarkup(<HelpPaths locale="es" ui={ui} />);

    expect(html).toContain(ui.home.pathHands);
    expect(html).toContain(ui.home.pathMoney);
    expect(html).toContain(ui.home.pathArticles);
    expect(html).toContain('href="/contacto"');
    expect(html).toContain('href="/ayudar/dinero"');
    expect(html).toContain('href="/catalogo"');
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tab"');
  });

  it("en inglés los destinos siguen siendo los slugs en castellano", () => {
    const { ui: en } = getContent("en");
    const html = renderToStaticMarkup(<HelpPaths locale="en" ui={en} />);

    expect(html).toContain(en.home.pathHands);
    expect(html).toContain('href="/en/contacto"');
    expect(html).toContain('href="/en/ayudar/dinero"');
    expect(html).toContain('href="/en/catalogo"');
  });
});
