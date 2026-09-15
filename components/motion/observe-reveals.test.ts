import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { observeReveals } from "./observe-reveals";

type Notificar = (entradas: { target: Element; isIntersecting: boolean }[]) => void;

let notificar: Notificar;
let observados: Element[];
let desobservados: Element[];
let parar: (() => void) | undefined;

beforeEach(() => {
  observados = [];
  desobservados = [];
  parar = undefined;

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {
      return undefined;
    },
    removeEventListener() {
      return undefined;
    },
  }));

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Notificar) {
        notificar = callback;
      }
      observe(elemento: Element) {
        observados.push(elemento);
      }
      unobserve(elemento: Element) {
        desobservados.push(elemento);
      }
      disconnect() {
        observados = [];
      }
    },
  );
});

afterEach(() => {
  parar?.();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function marcar(atributo: "data-reveal" | "data-reveal-photo"): HTMLElement {
  const nodo = document.createElement("div");
  nodo.setAttribute(atributo, "");
  document.body.append(nodo);
  return nodo;
}

describe("observeReveals", () => {
  it("marca data-in-view una sola vez y deja de observar", () => {
    const momento = marcar("data-reveal");
    const foto = marcar("data-reveal-photo");

    parar = observeReveals(document);

    expect(observados).toEqual([momento, foto]);

    notificar([
      { target: momento, isIntersecting: true },
      { target: foto, isIntersecting: true },
    ]);

    expect(momento.getAttribute("data-in-view")).toBe("");
    expect(foto.getAttribute("data-in-view")).toBe("");
    expect(desobservados).toEqual([momento, foto]);
  });

  it("no anima de nuevo si el elemento ya se descubrió", () => {
    const momento = marcar("data-reveal");
    momento.setAttribute("data-in-view", "");

    parar = observeReveals(document);

    expect(observados).toEqual([]);
  });

  it("con movimiento reducido no observa: el contenido no se oculta", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener() {
        return undefined;
      },
      removeEventListener() {
        return undefined;
      },
    }));

    marcar("data-reveal");
    parar = observeReveals(document);

    expect(observados).toEqual([]);
  });

  it("si no hay IntersectionObserver, no tira y el HTML se queda como está", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const momento = marcar("data-reveal");

    expect(() => observeReveals(document)).not.toThrow();
    expect(momento.hasAttribute("data-in-view")).toBe(false);
  });

  it("observa fotos que llegan después del primer barrido", async () => {
    parar = observeReveals(document);

    expect(observados).toEqual([]);

    const foto = marcar("data-reveal-photo");

    await vi.waitFor(() => {
      expect(observados).toEqual([foto]);
    });
  });
});
