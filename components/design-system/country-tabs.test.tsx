import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CountryCode } from "@/src/domain/entities";

import { CountryTabs, type CountryPanel } from "./country-tabs";

/**
 * La mejora progresiva de este componente no es un lujo de purista: si el
 * JavaScript no llega —conexión mala en Formosa, extensión que lo bloquea, error
 * en otro bundle—, lo que queda tiene que seguir mostrando los datos bancarios de
 * los tres países. Por eso el primer test mira el HTML del servidor, que es
 * literalmente lo que recibe un navegador sin JavaScript, y no el DOM ya
 * hidratado.
 */

const panels: readonly CountryPanel[] = [
  { country: "AR", content: <p>CBU 0000003100010000000001</p> },
  { country: "CL", content: <p>RUT 11111111-1</p> },
  { country: "US", content: <p>Routing 021000021</p> },
];

const NOMBRES = ["Argentina", "Chile", "Estados Unidos"] as const;

describe("CountryTabs sin JavaScript", () => {
  it("el HTML servido trae los tres países completos, uno debajo del otro", () => {
    const html = renderToStaticMarkup(<CountryTabs panels={panels} />);

    for (const nombre of NOMBRES) {
      expect(html).toContain(nombre);
    }

    // Los datos de cada país, no sólo los títulos: sin esto, alguien vería tres
    // encabezados y ninguna cuenta a la que transferir.
    expect(html).toContain("0000003100010000000001");
    expect(html).toContain("11111111-1");
    expect(html).toContain("021000021");
  });

  it("nada queda escondido detrás de un tab que no se puede apretar", () => {
    const html = renderToStaticMarkup(<CountryTabs panels={panels} />);

    // Un `role="tab"` sin JavaScript es un botón que no hace nada, y un panel con
    // `hidden` sería contenido inalcanzable. Antes de hidratar no hay ninguno de
    // los dos: hay tres secciones con su encabezado.
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain("hidden");
    expect(html.match(/<section/g)).toHaveLength(panels.length);
  });

  it("una lista vacía no dibuja un selector vacío", () => {
    expect(renderToStaticMarkup(<CountryTabs panels={[]} />)).toBe("");
  });
});

describe("CountryTabs con JavaScript", () => {
  it("expone los roles del patrón de tabs de ARIA y una sola solapa seleccionada", () => {
    render(<CountryTabs panels={panels} />);

    const tablist = screen.getByRole("tablist");
    const tabs = screen.getAllByRole("tab");

    expect(tablist).toHaveAccessibleName(/desde qu[eé] pa[ií]s/i);
    expect(tabs.map((tab) => tab.textContent)).toEqual([...NOMBRES]);
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
    ]);

    // Un solo tab en el orden de tabulación: quien navega con teclado llega al
    // grupo con un Tab y se mueve adentro con las flechas, no con nueve Tabs.
    expect(tabs.map((tab) => tab.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  it("cada panel declara a qué solapa pertenece y sólo el elegido queda expuesto", () => {
    render(<CountryTabs panels={panels} />);

    const visible = screen.getAllByRole("tabpanel");

    expect(visible).toHaveLength(1);
    expect(visible[0]).toHaveAccessibleName("Argentina");
    expect(visible[0]).toHaveTextContent("0000003100010000000001");
  });

  it("las flechas mueven la selección y también el foco, que es la mitad del patrón", async () => {
    const user = userEvent.setup();

    render(<CountryTabs panels={panels} />);

    await user.tab();

    expect(screen.getByRole("tab", { name: "Argentina" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    // Si la selección se moviera sin el foco, la siguiente flecha volvería a
    // partir de Argentina y el grupo quedaría inmanejable con teclado.
    expect(screen.getByRole("tab", { name: "Chile" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Chile" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("11111111-1");

    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Argentina" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("la flecha izquierda desde el primero da la vuelta al último", async () => {
    const user = userEvent.setup();

    render(<CountryTabs panels={panels} />);

    await user.tab();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Estados Unidos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Inicio y Fin van al primero y al último", async () => {
    const user = userEvent.setup();

    render(<CountryTabs panels={panels} />);

    await user.tab();
    await user.keyboard("{End}");

    expect(screen.getByRole("tab", { name: "Estados Unidos" })).toHaveFocus();

    await user.keyboard("{Home}");

    expect(screen.getByRole("tab", { name: "Argentina" })).toHaveFocus();
  });

  it("arranca en el país que se le pide, para no obligar a elegir de nuevo", async () => {
    const mostrado: CountryCode[] = [];
    const user = userEvent.setup();

    render(
      <CountryTabs
        panels={panels}
        initialCountry="US"
        onCountryShown={(country) => mostrado.push(country)}
      />,
    );

    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Estados Unidos");
    expect(mostrado).toEqual(["US"]);

    await user.click(screen.getByRole("tab", { name: "Chile" }));

    expect(mostrado).toEqual(["US", "CL"]);
  });
});
