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
  variant: "header" | "drawer" | "footer",
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

  it("una cuenta del público no ve Backoffice ni Métricas", () => {
    renderChrome(publicSession, "header");

    expect(screen.getByRole("link", { name: "Vecina" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
  });

  it("quien tiene rol ve Backoffice en el encabezado y en el menú", () => {
    const { unmount } = renderChrome(staffSession, "header");

    expect(screen.getByRole("link", { name: "Backoffice" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
    unmount();

    renderChrome(staffSession, "drawer");

    expect(screen.getByRole("link", { name: "Backoffice" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
    expect(screen.getByRole("link", { name: "Tu cuenta" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  });

  it("en el menú, Métricas va debajo de Backoffice sólo para owner", () => {
    const { unmount } = renderChrome(ownerSession, "header");

    expect(screen.getByRole("link", { name: "Backoffice" })).toHaveAttribute(
      "href",
      "/admin",
    );
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
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }).querySelector("svg"),
    ).not.toBeNull();
  });

  it("el pie no muestra Backoffice aunque haya rol", () => {
    renderChrome(staffSession, "footer");

    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
  });

  it("en /admin el chrome público no se personaliza", () => {
    renderChrome(ownerSession, "header", "/admin/catalogo");

    expect(screen.getByRole("link", { name: "Ingresar" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Métricas" })).toBeNull();
  });
});
