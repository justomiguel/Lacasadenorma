import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_SECTIONS } from "./nav";
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
    children: string;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("sectionIsCurrent", () => {
  it("una novedad concreta sigue marcando la sección, no el índice entero", () => {
    expect(sectionIsCurrent("/admin/novedades", "/admin/novedades")).toBe(true);
    expect(
      sectionIsCurrent(
        "/admin/novedades/11111111-1111-4111-8111-111111111111",
        "/admin/novedades",
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

  it("la sección abierta se marca con aria-current, y las otras no", () => {
    render(<AdminNav sections={ADMIN_SECTIONS} />);

    expect(screen.getByRole("link", { name: "Novedades" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Gastos" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
