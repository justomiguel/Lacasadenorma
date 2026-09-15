import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PhotoEssay, PhotoSequence } from "./photo";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => (
    // El mock de next/image en jsdom: no hay un bundler que lo reemplace.
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} className={className} />
  ),
}));

const foto = {
  url: "/fotos/ejemplo.jpg",
  alt: "La casa después del incendio",
  caption: null,
  credit: null,
  width: 1200,
  height: 900,
};

describe("PhotoSequence", () => {
  it("marca cada foto para revelarla al descubrirla, con escalón en las que siguen", () => {
    const { container } = render(
      <PhotoSequence
        groups={[
          {
            heading: "Así quedó",
            note: null,
            photos: [foto, { ...foto, url: "/fotos/dos.jpg" }],
          },
        ]}
      />,
    );

    const fotos = container.querySelectorAll("[data-reveal-photo]");

    expect(fotos).toHaveLength(2);
    expect(fotos[0]?.getAttribute("data-stagger")).toBeNull();
    expect(fotos[1]?.getAttribute("data-stagger")).toBe("1");
    expect(container.querySelector("[data-reveal]")).not.toBeNull();
  });
});

describe("PhotoEssay", () => {
  it("revela las fotos del cuerpo de una novedad", () => {
    const { container } = render(<PhotoEssay media={[{ ...foto, id: "una" }]} />);

    expect(container.querySelector("[data-reveal-photo]")).not.toBeNull();
  });
});
