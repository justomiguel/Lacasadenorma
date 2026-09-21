import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getContent } from "@/content/pack";

import { SiteHeader } from "./header";
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

describe("SiteHeader", () => {
  beforeEach(() => {
    mockDePathname.mockReturnValue("/");
    mockDeSesion.mockReturnValue({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    });
  });

  it("el menú del teléfono es un icono de 44 px, sin la palabra Menú", () => {
    render(<SiteHeader locale="es" siteName="La Casa de Norma" ui={ui} />);

    const menu = screen.getByRole("button", { name: "Abrir el menú" });

    expect(menu).not.toHaveTextContent("Menú");
    expect(menu.querySelector("svg"), "el menú es el pictograma").not.toBeNull();
    expect(menu.className).toMatch(/size-touch/);
    expect(menu.className).not.toMatch(/\bw-auto\b/);
  });

  it("con sesión el encabezado no tiene salir", () => {
    mockDeSesion.mockReturnValue({
      session: {
        status: "signed-in",
        displayName: "Vecina",
        email: "vecina@ejemplo.invalid",
        hasPortrait: false,
        staff: false,
        owner: false,
      },
      portraitSrc: null,
      refresh: () => undefined,
    });

    render(<SiteHeader locale="es" siteName="La Casa de Norma" ui={ui} />);

    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });
});
