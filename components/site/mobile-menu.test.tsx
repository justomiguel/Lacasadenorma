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
  owner: false,
} as const satisfies ChromeSession;

const ownerSession = {
  status: "signed-in",
  displayName: "Dueña",
  email: "duena@ejemplo.invalid",
  hasPortrait: false,
  staff: true,
  owner: true,
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

  function renderMenu() {
    return render(
      <MobileMenu
        id="menu"
        locale="es"
        siteName="La Casa de Norma"
        ui={ui}
        canonical="/"
        helpHref="/ayudar#donaciones"
        closeRef={createRef()}
        onClose={() => undefined}
      />,
    );
  }

  it("no lista Cómo ayudar: esa ruta ya es el CTA", () => {
    renderMenu();

    expect(screen.queryByRole("link", { name: "Cómo ayudar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ayudar a reconstruir" })).toBeTruthy();
  });

  it("Backoffice queda arriba de las secciones, no debajo del pliegue", () => {
    renderMenu();

    const pledges = screen.getByRole("link", { name: "Mis donaciones" });
    const backoffice = screen.getByRole("link", { name: "Backoffice" });
    const historia = screen.getByRole("link", { name: "Historia" });

    expect(pledges).toHaveAttribute("href", "/cuenta?seccion=reservas");
    expect(
      pledges.compareDocumentPosition(backoffice) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      backoffice.compareDocumentPosition(historia) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
  });

  it("Métricas queda debajo de Backoffice y arriba de las secciones", () => {
    mockDeSesion.mockReturnValue({
      session: ownerSession,
      portraitSrc: null,
      refresh: () => undefined,
    });
    renderMenu();

    const backoffice = screen.getByRole("link", { name: "Backoffice" });
    const metricas = screen.getByRole("link", { name: "Métricas" });
    const historia = screen.getByRole("link", { name: "Historia" });

    expect(metricas).toHaveAttribute("href", "/admin/metricas");
    expect(
      backoffice.compareDocumentPosition(metricas) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      metricas.compareDocumentPosition(historia) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(metricas.querySelector("svg")).not.toBeNull();
  });

  it("cerrar sesión queda al pie, con fondo rojo", () => {
    renderMenu();

    const salir = screen.getByRole("button", { name: "Cerrar sesión" });
    const ayudar = screen.getByRole("link", { name: "Ayudar a reconstruir" });

    expect(salir.className).toMatch(/bg-danger/);
    expect(
      salir.compareDocumentPosition(ayudar) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
