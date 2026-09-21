import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SectionTabs, type TabItem } from "./tabs";

/**
 * `SectionTabs` es el índice editorial de la cuenta. Si el JavaScript no llega,
 * quien entró tiene que poder leer todos los paneles igual: por eso el primer
 * bloque mira el HTML del servidor y no el DOM ya hidratado.
 */

const items: readonly TabItem[] = [
  { id: "aporte", label: "Aportar dinero", content: <p>CBU 0000003100010000000001</p> },
  {
    id: "terreno",
    label: "Dar una mano",
    heading: "Coordinar en el pueblo",
    content: <p>WhatsApp de Justo</p>,
  },
  { id: "materiales", label: "Donar materiales", content: <p>Cemento, cal, arena</p> },
];

describe("SectionTabs sin JavaScript", () => {
  it("el HTML servido trae los tres paneles completos, uno debajo del otro", () => {
    const html = renderToStaticMarkup(
      <SectionTabs items={items} label="Formas de ayudar" />,
    );

    expect(html).toContain("0000003100010000000001");
    expect(html).toContain("WhatsApp de Justo");
    expect(html).toContain("Cemento, cal, arena");
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain("hidden");
    expect(html.match(/<section/g)).toHaveLength(items.length);
  });

  it("apilado, sólo pone encabezado al panel que no trae el suyo", () => {
    const html = renderToStaticMarkup(
      <SectionTabs items={items} label="Formas de ayudar" />,
    );

    expect(html).toContain("Coordinar en el pueblo");
    expect(html.match(/<h3/g)).toHaveLength(1);
  });

  it("una lista vacía no dibuja nada", () => {
    expect(
      renderToStaticMarkup(<SectionTabs items={[]} label="Formas de ayudar" />),
    ).toBe("");
  });
});

describe("SectionTabs con JavaScript", () => {
  it("expone el patrón de tabs de ARIA, con la primera pestaña abierta", () => {
    render(<SectionTabs items={items} label="Formas de ayudar" />);

    const tablist = screen.getByRole("tablist", { name: "Formas de ayudar" });
    const tabs = screen.getAllByRole("tab");

    expect(tablist).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(tabs[0]?.className).toMatch(/font-medium/);
    expect(tabs[0]?.className).not.toMatch(/-mb-px/);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("0000003100010000000001");
    expect(screen.queryByText("WhatsApp de Justo")).not.toBeInTheDocument();
  });

  it("cambia de panel con el mouse y con las flechas, y avisa el cambio", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];

    render(
      <SectionTabs
        items={items}
        label="Formas de ayudar"
        onChange={(id) => {
          seen.push(id);
        }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Dar una mano" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("WhatsApp de Justo");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Donar materiales" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Cemento, cal, arena");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Aportar dinero" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Donar materiales" })).toHaveFocus();

    expect(seen).toEqual(["terreno", "materiales", "aporte", "materiales"]);
  });

  it("acepta una pestaña inicial distinta de la primera", () => {
    render(<SectionTabs items={items} label="Formas de ayudar" initial="materiales" />);

    expect(screen.getByRole("tab", { name: "Donar materiales" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
