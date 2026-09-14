import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content";

import { LegalDocument } from "./legal-document";
import { SITE_MARK } from "./mark";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // El mock de next/image en jsdom: no hay un bundler que lo reemplace.
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

describe("LegalDocument", () => {
  it("privacidad y términos llevan el símbolo como membrete", () => {
    const { legal, ui } = getContent("es");

    for (const document of [legal.privacy, legal.terms]) {
      const { container } = render(
        <LegalDocument
          document={document}
          updatedOn={legal.updatedOn}
          locale="es"
          legalLabel={ui.legalLabel}
          lastUpdatedLabel={ui.lastUpdated}
        />,
      );

      expect(container.querySelector("img"), document.title).toHaveAttribute(
        "src",
        SITE_MARK.src,
      );
      expect(container.querySelector("h1")).toHaveTextContent(document.title);
    }
  });
});
