import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthShell } from "@/components/account/auth-shell";
import { SITE_MARK } from "@/components/site/mark";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // El mock de next/image en jsdom: no hay un bundler que lo reemplace.
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

describe("AuthShell", () => {
  it("las pantallas de cuenta llevan el símbolo arriba del título", () => {
    const { container } = render(
      <AuthShell title="Ingresar" lead="Entrá con el correo de la cuenta.">
        <form />
      </AuthShell>,
    );

    expect(container.querySelector("img")).toHaveAttribute("src", SITE_MARK.src);
    expect(container.querySelector("h1")).toHaveTextContent("Ingresar");
  });

  it("el índice de la cuenta hunde las pestañas en otra superficie, pegadas al encabezado", () => {
    const { container } = render(
      <AuthShell
        title="Tu cuenta"
        lead="Acá está todo lo que el sitio guarda de vos."
        surface="sunk"
      >
        <p>Cómo aparecer</p>
      </AuthShell>,
    );

    const sunk = container.querySelector(".bg-paper-sunk");

    expect(sunk).not.toBeNull();
    expect(sunk).toHaveTextContent("Cómo aparecer");
    expect(sunk?.querySelector("h1")).toBeNull();
  });
});
