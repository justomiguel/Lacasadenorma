import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getContent } from "@/content/pack";

import { MobileMenu } from "./mobile-menu";
import type { ChromeSession } from "./session";

const { mockDePathname, mockDeSesion } = vi.hoisted(() => ({
  mockDePathname: vi.fn(() => "/"),
  mockDeSesion: vi.fn(
    (): { session: ChromeSession; portraitSrc: string | null; refresh: () => void } => ({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    }),
  ),
}));

vi.mock("next/navigation", () => ({ usePathname: mockDePathname }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));
vi.mock("@/app/(es)/cuenta/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/src/infrastructure/analytics/browser", () => ({ track: vi.fn() }));
vi.mock("./session", () => ({
  useChromeSession: mockDeSesion,
}));

const ui = getContent("es").ui;

const staffSession = {
  status: "signed-in",
  displayName: "Editora",
  email: "editora@ejemplo.invalid",
  hasPortrait: false,
  staff: true,
} as const satisfies ChromeSession;

describe("MobileMenu", () => {
  beforeEach(() => {
    mockDePathname.mockReturnValue("/");
    mockDeSesion.mockReturnValue({
      session: staffSession,
      portraitSrc: null,
      refresh: () => undefined,
    });
  });

  it("Backoffice queda arriba de las secciones, no debajo del pliegue", () => {
    render(
      <MobileMenu
        id="menu"
        locale="es"
        siteName="La Casa de Norma"
        ui={ui}
        canonical="/"
        switchHref="/en"
        helpHref="/ayudar#donaciones"
        closeRef={createRef()}
        onClose={() => undefined}
      />,
    );

    const links = screen.getAllByRole("link").map((link) => link.textContent);
    const backoffice = links.indexOf("Backoffice");
    const historia = links.indexOf("Historia");

    expect(backoffice).toBeGreaterThanOrEqual(0);
    expect(historia).toBeGreaterThan(backoffice);
  });
});
