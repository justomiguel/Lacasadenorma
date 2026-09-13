import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content/pack";

import { PressClippings } from "./press-clippings";

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
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} className={className} />
  ),
}));

const { ui, whatHappened } = getContent("es");

describe("PressClippings", () => {
  it("el HTML servido trae cada nota con su propio título y sin leer más", () => {
    const html = renderToStaticMarkup(
      <PressClippings
        items={whatHappened.press}
        heading={ui.whatHappenedPage.pressHeading}
        lead={ui.whatHappenedPage.pressLead}
        contextHeading={ui.whatHappenedPage.pressContextHeading}
        headingId="la-prensa"
      />,
    );

    expect(html).toContain(ui.whatHappenedPage.pressHeading);
    expect(html).toContain(ui.whatHappenedPage.pressContextHeading);
    expect(html).not.toMatch(/leer más/i);

    for (const item of whatHappened.press) {
      expect(html).toContain(item.url);
      expect(html).toContain(item.title);
    }
  });

  it("cada título es el enlace, y es único", () => {
    render(
      <PressClippings
        items={whatHappened.press}
        heading={ui.whatHappenedPage.pressHeading}
        lead={ui.whatHappenedPage.pressLead}
        contextHeading={ui.whatHappenedPage.pressContextHeading}
        headingId="la-prensa"
      />,
    );

    for (const item of whatHappened.press) {
      expect(screen.getByRole("link", { name: item.title })).toHaveAttribute(
        "href",
        item.url,
      );
    }
  });
});
