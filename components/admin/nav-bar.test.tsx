import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_SECTIONS, visibleAdminGroups } from "./nav";
import { AdminNav, sectionIsCurrent } from "./nav-bar";

const { mockDePathname } = vi.hoisted(() => ({
  mockDePathname: vi.fn(() => "/admin/novedades"),
}));

vi.mock("next/navigation", () => ({ usePathname: mockDePathname }));
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

describe("visibleAdminGroups", () => {
  it("un editor ve Campaña y Catálogo, no Plata", () => {
    const editor = ADMIN_SECTIONS.filter(
      (section) =>
        section.href === "/admin/novedades" ||
        section.href === "/admin/hitos" ||
        section.href === "/admin/catalogo",
    );
    const groups = visibleAdminGroups(editor);

    expect(groups.map((group) => group.id)).toEqual(["campana", "catalogo"]);
    expect(groups[0]?.href).toBe("/admin/novedades");
    expect(groups[1]?.label).toBe("Catálogo");
    expect(groups[1]?.sections).toHaveLength(1);
  });
});

describe("sectionIsCurrent", () => {
  it("una novedad concreta sigue marcando la sección, no el índice entero", () => {
    expect(sectionIsCurrent("/admin/novedades", "/admin/novedades")).toBe(true);
    expect(
      sectionIsCurrent(
        "/admin/novedades/11111111-1111-4111-8111-111111111111",
        "/admin/novedades",
      ),
    ).toBe(true);
    expect(
      sectionIsCurrent(
        "/admin/donantes/11111111-1111-4111-8111-111111111111",
        "/admin/donantes",
      ),
    ).toBe(true);
    expect(sectionIsCurrent("/admin/novedades", "/admin/gastos")).toBe(false);
    expect(sectionIsCurrent("/admin", "/admin/novedades")).toBe(false);
  });
});

describe("AdminNav", () => {
  beforeEach(() => {
    mockDePathname.mockReturnValue("/admin/novedades");
  });

  it("el grupo abierto se marca, y las secciones no son enlaces del menú", () => {
    render(<AdminNav sections={ADMIN_SECTIONS} />);

    expect(
      screen.getByRole("list", { name: "Secciones del backoffice" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Campaña" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Campaña" })).toHaveAttribute(
      "href",
      "/admin/novedades",
    );
    expect(screen.getByRole("link", { name: "Plata" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.queryByRole("link", { name: "Novedades" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Gastos" })).toBeNull();
    expect(screen.getByRole("link", { name: "Catálogo" })).toHaveAttribute(
      "href",
      "/admin/catalogo",
    );
    expect(screen.getByRole("link", { name: "Donaciones" })).toHaveAttribute(
      "href",
      "/admin/donaciones",
    );
    expect(screen.getByRole("link", { name: "Donantes" })).toHaveAttribute(
      "href",
      "/admin/donantes",
    );
  });
});
