import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SITE_MARK } from "@/components/site/mark";
import { getContent } from "@/content";

import { NotFoundScreen } from "./not-found-screen";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // El mock de next/image en jsdom: no hay un bundler que lo reemplace.
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

describe("NotFoundScreen", () => {
  it("el 404 lleva el símbolo como membrete, sin inventar una página de campaña", () => {
    const { ui } = getContent("es");
    const { container } = render(<NotFoundScreen locale="es" />);

    expect(container.querySelector("img")).toHaveAttribute("src", SITE_MARK.src);
    expect(container.querySelector("h1")).toHaveTextContent(ui.notFoundPage.title);
  });
});
