import { act, render, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HelpBar } from "./help-bar";
import { localizedHref } from "@/src/i18n/href";

/**
 * La barra hace una sola cosa difícil: decidir cuándo *no* estar. Y esa decisión
 * depende de un observador de intersección, o sea de la única parte del componente
 * que no existe si el JavaScript no llega. De ahí la forma de estos tests: el
 * primero mira el HTML servido, que es lo que recibe un navegador sin JavaScript, y
 * comprueba que ahí la barra está. Los demás simulan el observador a mano.
 */

const { mockDePathname } = vi.hoisted(() => ({ mockDePathname: vi.fn(() => "/") }));

vi.mock("next/navigation", () => ({ usePathname: mockDePathname }));

type Notificar = (entradas: { target: Element; isIntersecting: boolean }[]) => void;

let notificar: Notificar;
let observados: Element[];

beforeEach(() => {
  mockDePathname.mockReturnValue("/");
  observados = [];

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Notificar) {
        notificar = callback;
      }
      observe(elemento: Element) {
        observados.push(elemento);
      }
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

/** Pone en el documento una acción primaria como las que marca `HelpCta`. */
function ponerAccionPrimaria(): HTMLElement {
  const accion = document.createElement("a");
  accion.setAttribute("data-help-primary", "");
  accion.href = "/ayudar";
  accion.textContent = "Ayudar a reconstruir";
  document.body.append(accion);
  return accion;
}

/**
 * La acción de la barra, buscada dentro del árbol del componente y no en todo el
 * documento: la acción primaria de la página tiene el mismo texto —es el punto de
 * todo esto— y una búsqueda global encontraría las dos.
 */
const barra = (container: HTMLElement) =>
  within(container).queryByRole("link", { name: /ayudar a reconstruir/i });

describe("HelpBar sin JavaScript", () => {
  it("el HTML servido ya trae la acción: si la hidratación no llega, no se pierde", () => {
    const html = renderToStaticMarkup(<HelpBar />);

    expect(html).toContain("Ayudar a reconstruir");
    expect(html).toContain('href="#donaciones"');
  });

  it("en una página interior el destino es la página de aportes", () => {
    mockDePathname.mockReturnValue("/norma");

    const html = renderToStaticMarkup(<HelpBar />);

    expect(html).toContain('href="/ayudar#donaciones"');
  });
});

describe("HelpBar", () => {
  it("no se muestra en la página de aportes, donde llevaría a donde ya estás", () => {
    mockDePathname.mockReturnValue("/ayudar");

    const { container } = render(<HelpBar />);

    expect(barra(container)).toBeNull();
  });

  it("tampoco se muestra en /en/ayudar: es la misma página, en el otro idioma", () => {
    mockDePathname.mockReturnValue("/en/ayudar");

    const { container } = render(
      <HelpBar href={localizedHref("/ayudar", "en")} label="Help rebuild" />,
    );

    expect(within(container).queryByRole("link", { name: /help rebuild/i })).toBeNull();
  });

  it("se retira mientras la acción primaria está en pantalla", () => {
    const accion = ponerAccionPrimaria();

    const { container } = render(<HelpBar />);
    expect(barra(container)).toBeVisible();
    expect(observados).toContain(accion);

    act(() => {
      notificar([{ target: accion, isIntersecting: true }]);
    });

    expect(barra(container)).toBeNull();
  });

  it("vuelve cuando la acción primaria sale de pantalla", () => {
    const accion = ponerAccionPrimaria();

    const { container } = render(<HelpBar />);

    act(() => {
      notificar([{ target: accion, isIntersecting: true }]);
    });
    act(() => {
      notificar([{ target: accion, isIntersecting: false }]);
    });

    expect(barra(container)).toBeVisible();
  });

  it("con dos acciones primarias, alcanza que una esté visible", () => {
    const primera = ponerAccionPrimaria();
    const segunda = ponerAccionPrimaria();

    const { container } = render(<HelpBar />);

    act(() => {
      notificar([
        { target: primera, isIntersecting: true },
        { target: segunda, isIntersecting: true },
      ]);
    });
    act(() => {
      notificar([{ target: primera, isIntersecting: false }]);
    });

    expect(
      barra(container),
      "se retiró con la segunda acción todavía en pantalla",
    ).toBeNull();
  });

  it("no se retira con el foco adentro: nadie pierde el foco sin haber hecho nada", () => {
    const accion = ponerAccionPrimaria();

    const { container } = render(<HelpBar />);
    barra(container)?.focus();

    act(() => {
      notificar([{ target: accion, isIntersecting: true }]);
    });

    expect(barra(container)).toBeVisible();
  });

  it("en una página sin acción primaria se queda, y no observa nada", () => {
    const { container } = render(<HelpBar />);

    expect(barra(container)).toBeVisible();
    expect(observados).toHaveLength(0);
  });

  it("reserva su alto siempre, también cuando se retira: el layout no salta", () => {
    const accion = ponerAccionPrimaria();

    const { container } = render(<HelpBar />);
    const espaciador = () => container.querySelector(".h-helpbar");

    expect(espaciador()).not.toBeNull();

    act(() => {
      notificar([{ target: accion, isIntersecting: true }]);
    });

    expect(espaciador(), "el espaciador se fue con la barra").not.toBeNull();
  });
});
