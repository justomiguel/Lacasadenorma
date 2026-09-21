import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkSidebar } from "./work-sidebar";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/site/session", () => ({
  useChromeSession: () => ({
    session: { status: "anonymous" },
    portraitSrc: null,
    refresh: () => undefined,
  }),
}));

describe("WorkSidebar", () => {
  it("en el teléfono no se pinta: esas salidas viven en el drawer", () => {
    const { container } = render(
      <WorkSidebar accountHref="/cuenta" emptyName="Tu cuenta" nav={<p>nav</p>}>
        contenido
      </WorkSidebar>,
    );

    const aside = container.querySelector("aside");

    expect(aside, "el menú de trabajo es el aside").not.toBeNull();
    expect(aside?.className, "oculto hasta escritorio").toMatch(/\bhidden\b/);
    expect(aside?.className, "columna fija en lg").toMatch(/\blg:block\b/);
  });
});
