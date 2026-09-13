import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BRANDS } from "@/content/brands";

import { BrandLabel, BrandMark } from "./brand-mark";

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

describe("BrandMark", () => {
  it("cada marca del catálogo tiene un archivo y se pinta junto al nombre", () => {
    for (const id of Object.keys(BRANDS) as (keyof typeof BRANDS)[]) {
      const brand = BRANDS[id];
      const { container } = render(<BrandLabel id={id}>{brand.name}</BrandLabel>);

      const img = container.querySelector("img");

      expect(img, id).not.toBeNull();
      expect(img).toHaveAttribute("src", brand.src);
      expect(img).toHaveAttribute("alt", "");
      expect(container).toHaveTextContent(brand.name);
    }
  });

  it("el mark solo no dice el nombre: el texto lo pone quien lo llama", () => {
    const { container } = render(<BrandMark id="paypal" />);

    expect(container.querySelector("img")).toHaveAttribute("src", BRANDS.paypal.src);
    expect(container).not.toHaveTextContent("PayPal");
  });
});
