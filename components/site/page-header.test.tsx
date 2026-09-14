import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SITE_MARK } from "./mark";
import { PageHeader } from "./page-header";

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

describe("PageHeader", () => {
  it("sin mark no pinta el símbolo: el chrome del sitio ya lo lleva", () => {
    const { container } = render(<PageHeader title="Cómo ayudar" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("h1")).toHaveTextContent("Cómo ayudar");
  });

  it("con mark el símbolo va arriba del título, sin repetir el nombre", () => {
    const { container } = render(<PageHeader mark title="Privacidad" />);
    const img = container.querySelector("img");

    expect(img).toHaveAttribute("src", SITE_MARK.src);
    expect(img).toHaveAttribute("alt", "");
    expect(container).not.toHaveTextContent("La Casa de Norma");
  });
});
