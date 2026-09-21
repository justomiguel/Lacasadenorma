import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ADMIN_SECTIONS } from "@/components/admin/nav";
import { getContent } from "@/content";

import { WorkNav } from "./work-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/novedades",
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

describe("WorkNav", () => {
  const { account, ui } = getContent("es");

  it("sin rol no nombra el backoffice", () => {
    render(
      <WorkNav
        locale="es"
        copy={account.profile}
        currentAccount="cuenta"
        adminSections={[]}
        backofficeLabel={ui.backoffice}
      />,
    );

    expect(screen.queryByRole("link", { name: /^backoffice$/i })).toBeNull();
    expect(screen.queryByRole("list", { name: "Secciones del backoffice" })).toBeNull();
    expect(screen.getByRole("link", { name: account.profile.title })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Mis donaciones" })).toHaveAttribute(
      "href",
      "/cuenta?seccion=reservas",
    );
    expect(screen.queryByRole("link", { name: /cómo aparecer/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^acceso$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^borrar$/i })).toBeNull();
  });

  it("con rol el backoffice es un submenú siempre abierto", () => {
    render(
      <WorkNav
        locale="es"
        copy={account.profile}
        currentAccount="acceso"
        adminSections={ADMIN_SECTIONS}
        backofficeLabel={ui.backoffice}
      />,
    );

    expect(screen.getByRole("link", { name: account.profile.title })).toHaveAttribute(
      "href",
      "/cuenta?seccion=cuenta",
    );
    expect(screen.getByRole("link", { name: account.profile.title })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: ui.backoffice })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.getByRole("list", { name: "Secciones del backoffice" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Campaña" })).toHaveAttribute(
      "aria-current",
      "page",
    );
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
    expect(screen.queryByRole("link", { name: "Novedades" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Gastos" })).toBeNull();
  });
});
