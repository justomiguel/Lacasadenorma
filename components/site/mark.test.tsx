import { readFileSync } from "node:fs";
import path from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_MARK, MARK_VARIANTS } from "@/content/marca";

import { SITE_MARK, SiteMark } from "./mark";

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

/** Ancho y alto reales de un PNG, leídos del IHDR. */
function pngSize(file: string): { width: number; height: number } {
  const buffer = readFileSync(file);

  expect(
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  ).toBe(true);
  expect(buffer.subarray(12, 16).toString("ascii")).toBe("IHDR");

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("SiteMark", () => {
  it("cada variante recortada existe y mide lo que declara el catálogo", () => {
    expect(SITE_MARK).toBe(DEFAULT_MARK);
    expect(DEFAULT_MARK).toBe(MARK_VARIANTS.original);

    for (const [id, variant] of Object.entries(MARK_VARIANTS)) {
      const file = path.join(process.cwd(), "public", variant.src.replace(/^\//u, ""));
      const size = pngSize(file);

      expect(size, id).toEqual({ width: variant.width, height: variant.height });
    }
  });

  it("el favicon y el icono de Apple salen de ese recorte, en los tamaños que Next espera", () => {
    expect(pngSize(path.join(process.cwd(), "app", "icon.png"))).toEqual({
      width: 32,
      height: 32,
    });
    expect(pngSize(path.join(process.cwd(), "app", "apple-icon.png"))).toEqual({
      width: 180,
      height: 180,
    });
  });

  it("el mark no dice el nombre: el texto lo pone quien lo llama", () => {
    const { container } = render(<SiteMark />);
    const img = container.querySelector("img");

    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", SITE_MARK.src);
    expect(img).toHaveAttribute("alt", "");
    expect(container).not.toHaveTextContent("La Casa de Norma");
  });
});
