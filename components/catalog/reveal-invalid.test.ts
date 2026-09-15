import { afterEach, describe, expect, it, vi } from "vitest";

import {
  captureFirstInvalid,
  revealFormError,
  revealInvalidField,
} from "./reveal-invalid";

afterEach(() => {
  document.body.innerHTML = "";
});

function campo(tag: "input" | "textarea" = "input"): {
  nodo: HTMLElement;
  scroll: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
} {
  const nodo = document.createElement(tag);
  const scroll = vi.fn();
  const focus = vi.fn();

  nodo.scrollIntoView = scroll;
  nodo.focus = focus as HTMLElement["focus"];
  document.body.append(nodo);

  return { nodo, scroll, focus };
}

describe("revealInvalidField", () => {
  it("lleva al campo al centro y le da el foco", () => {
    const { nodo, scroll, focus } = campo();

    revealInvalidField(nodo);

    expect(scroll).toHaveBeenCalledWith({
      block: "center",
      behavior: "smooth",
    });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("no hace nada si el target no es un campo", () => {
    expect(() => {
      revealInvalidField(null);
    }).not.toThrow();
  });

  it("con movimiento reducido, el scroll es instantáneo", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener() {
        return undefined;
      },
      removeEventListener() {
        return undefined;
      },
    }));

    const { nodo, scroll } = campo();

    revealInvalidField(nodo);

    expect(scroll).toHaveBeenCalledWith({
      block: "center",
      behavior: "auto",
    });

    vi.unstubAllGlobals();
  });
});

describe("captureFirstInvalid", () => {
  it("revela el primero y no el segundo del mismo envío", () => {
    const form = document.createElement("form");
    const primero = campo();
    const segundo = campo();

    form.append(primero.nodo, segundo.nodo);
    document.body.append(form);

    captureFirstInvalid({ target: primero.nodo });
    captureFirstInvalid({ target: segundo.nodo });

    expect(primero.scroll).toHaveBeenCalledTimes(1);
    expect(segundo.scroll).not.toHaveBeenCalled();
  });
});

describe("revealFormError", () => {
  it("busca el primer aria-invalid del form", () => {
    const form = document.createElement("form");
    const ok = campo();
    const malo = campo("textarea");

    malo.nodo.setAttribute("aria-invalid", "true");
    form.append(ok.nodo, malo.nodo);

    revealFormError(form);

    expect(malo.scroll).toHaveBeenCalled();
    expect(ok.scroll).not.toHaveBeenCalled();
  });
});
