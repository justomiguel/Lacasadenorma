import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getContent } from "@/content/pack";

import { AccountChrome } from "./account-chrome";
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
vi.mock("./session", () => ({
  useChromeSession: mockDeSesion,
}));

const ui = getContent("es").ui;

function renderChrome(
  session: ChromeSession,
  variant: "header" | "drawer" | "footer" | "sign-out",
  pathname = "/",
) {
  mockDePathname.mockReturnValue(pathname);
  mockDeSesion.mockReturnValue({ session, portraitSrc: null, refresh: () => undefined });

  return render(<AccountChrome locale="es" ui={ui} variant={variant} />);
}

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

const publicSession = {
  status: "signed-in",
  displayName: "Vecina",
  email: "vecina@ejemplo.invalid",
  hasPortrait: false,
  staff: false,
  owner: false,
} as const satisfies ChromeSession;

function hrefs() {
  return screen.getAllByRole("link").map((link) => link.getAttribute("href"));
}

describe("AccountChrome", () => {
  beforeEach(() => {
    mockDePathname.mockReturnValue("/");
    mockDeSesion.mockReturnValue({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    });
  });

  it("el nombre del panel no se traduce", () => {
    expect(getContent("es").ui.backoffice).toBe("Backoffice");
    expect(getContent("en").ui.backoffice).toBe("Backoffice");
    expect(getContent("es").ui.metrics).toBe("Métricas");
    expect(getContent("en").ui.metrics).toBe("Métricas");
  });

  it("una cuenta del público ve Mi Panel, no salir ni el nombre", () => {
    renderChrome(publicSession, "header");

    const panel = screen.getByRole("link", { name: "Mi Panel" });

    expect(panel).toHaveAttribute("href", "/cuenta");
    expect(panel.className).toMatch(/rounded-md/);
    expect(panel.className).toMatch(/\bborder\b/);
    expect(panel.querySelector("svg"), "Mi Panel lleva persona antes del nombre").not.toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Vecina" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
  });

  it("quien tiene rol ve Backoffice en el menú, no en el encabezado", () => {
    const { unmount } = renderChrome(staffSession, "header");

    expect(screen.getByRole("link", { name: "Mi Panel" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
    unmount();

    renderChrome(staffSession, "drawer");

    expect(screen.getByRole("link", { name: "Backoffice" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
    expect(screen.getByRole("link", { name: "Mis donaciones" })).toHaveAttribute(
      "href",
      "/cuenta?seccion=reservas",
    );
    expect(screen.getByRole("link", { name: "Tu cuenta" })).toHaveAttribute(
      "href",
      "/cuenta?seccion=cuenta",
    );
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("en el menú, Métricas va debajo de Backoffice sólo para owner", () => {
    const { unmount } = renderChrome(ownerSession, "header");

    expect(screen.getByRole("link", { name: "Mi Panel" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
    unmount();

    renderChrome(ownerSession, "drawer");

    const paths = hrefs();
    expect(paths.indexOf("/admin/metricas")).toBe(paths.indexOf("/admin") + 1);
    expect(
      screen.getByRole("link", { name: "Métricas" }).querySelector("svg"),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Backoffice" }).querySelector("svg"),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Tu cuenta" }).querySelector("svg"),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("cerrar sesión en el pie del menú es un bloque rojo con el nombre", () => {
    renderChrome(publicSession, "sign-out");

    const salir = screen.getByRole("button", { name: "Cerrar sesión" });

    expect(salir.className).toMatch(/bg-danger/);
    expect(salir.querySelector("svg")).not.toBeNull();
    expect(salir).toHaveTextContent("Cerrar sesión");
  });

  it("en el encabezado, Ingresar tiene caja y no se lee como la nav", () => {
    renderChrome({ status: "anonymous" }, "header");

    const ingresar = screen.getByRole("link", { name: "Ingresar" });

    expect(ingresar.className).toMatch(/rounded-md/);
    expect(ingresar.className).toMatch(/\bborder\b/);
    expect(ingresar.className).not.toMatch(/bg-forest/);
    expect(ingresar.querySelector("svg"), "Ingresar lleva persona antes del nombre").not.toBeNull();
  });

  it("en el pie, Ingresar sigue siendo texto", () => {
    render(
      <AccountChrome locale="es" ui={ui} variant="footer" className="text-small" />,
    );

    expect(screen.getByRole("link", { name: "Ingresar" }).className).not.toMatch(
      /rounded-md/,
    );
  });

  it("el pie no muestra Backoffice aunque haya rol", () => {
    renderChrome(staffSession, "footer");

    expect(screen.getByRole("link", { name: "Mi Panel" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
    expect(screen.queryByRole("link", { name: "Editora" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
  });

  it("en /admin el encabezado sigue siendo Mi Panel, no el nombre", () => {
    renderChrome(ownerSession, "header", "/admin/catalogo");

    expect(screen.getByRole("link", { name: "Mi Panel" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
    expect(screen.queryByRole("link", { name: "Dueña" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Ingresar" })).toBeNull();
  });
});
