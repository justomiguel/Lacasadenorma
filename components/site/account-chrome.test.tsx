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
vi.mock("./session", async () => {
  const actual = await vi.importActual<typeof import("./session")>("./session");

  return {
    ...actual,
    useChromeSession: mockDeSesion,
  };
});

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
} as const satisfies ChromeSession;

const publicSession = {
  status: "signed-in",
  displayName: "Vecina",
  email: "vecina@ejemplo.invalid",
  hasPortrait: false,
  staff: false,
} as const satisfies ChromeSession;

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
  });

  it("una cuenta del público no ve Backoffice", () => {
    renderChrome(publicSession, "header");

    expect(screen.getByRole("link", { name: "Vecina" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
  });

  it("quien tiene rol ve Backoffice en el encabezado y en el menú", () => {
    const { unmount } = renderChrome(staffSession, "header");

    expect(screen.getByRole("link", { name: "Backoffice" })).toHaveAttribute(
      "href",
      "/admin",
    );
    unmount();

    renderChrome(staffSession, "drawer");

    expect(screen.getByRole("link", { name: "Backoffice" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByRole("link", { name: "Tu cuenta" })).toHaveAttribute(
      "href",
      "/cuenta",
    );
  });

  it("el pie no muestra Backoffice aunque haya rol", () => {
    renderChrome(staffSession, "footer");

    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
  });

  it("en /admin el chrome público no se personaliza", () => {
    renderChrome(staffSession, "header", "/admin/catalogo");

    expect(screen.getByRole("link", { name: "Ingresar" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Backoffice" })).toBeNull();
  });
});
