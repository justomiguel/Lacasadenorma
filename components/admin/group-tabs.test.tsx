import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ADMIN_SECTIONS } from "./nav";
import { AdminGroupTabs } from "./group-tabs";

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

describe("AdminGroupTabs", () => {
  it("en Campaña muestra las pestañas hermanas, no Plata", () => {
    render(<AdminGroupTabs sections={ADMIN_SECTIONS} />);

    expect(screen.getByRole("tablist", { name: "Campaña" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Novedades" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Hitos" })).toHaveAttribute(
      "href",
      "/admin/hitos",
    );
    expect(screen.getByRole("tab", { name: "Objetivo" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Gastos" })).toBeNull();
  });

  it("un grupo de una sola sección no pinta pestañas", () => {
    mockDePathname.mockReturnValue("/admin/metricas");

    render(<AdminGroupTabs sections={ADMIN_SECTIONS} />);

    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("Catálogo, Donaciones y Donantes no se pestañean entre sí", () => {
    mockDePathname.mockReturnValue("/admin/catalogo");

    render(<AdminGroupTabs sections={ADMIN_SECTIONS} />);

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tab", { name: "Donaciones" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Donantes" })).toBeNull();
  });
});
