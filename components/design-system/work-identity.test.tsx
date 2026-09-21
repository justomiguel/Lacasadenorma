import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ChromeSession } from "@/components/site/session";

import { WorkIdentity } from "./work-identity";

const { mockDeSesion } = vi.hoisted(() => ({
  mockDeSesion: vi.fn(
    (): { session: ChromeSession; portraitSrc: string | null; refresh: () => void } => ({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    }),
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
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

vi.mock("@/components/site/session", () => ({
  useChromeSession: mockDeSesion,
}));

describe("WorkIdentity", () => {
  it("el retrato mide 128 px, es circular y lleva nombre y correo", () => {
    mockDeSesion.mockReturnValue({
      session: {
        status: "signed-in",
        displayName: "Justo",
        email: "justo@ejemplo.invalid",
        hasPortrait: true,
        staff: false,
        owner: false,
      },
      portraitSrc: "/cuenta/retrato?v=0",
      refresh: () => undefined,
    });

    render(<WorkIdentity href="/cuenta" emptyName="Tu cuenta" />);

    const portrait = screen.getByRole("img", { name: "Justo" });

    expect(portrait).toHaveAttribute("width", "128");
    expect(portrait).toHaveAttribute("height", "128");
    expect(portrait).toHaveAttribute("src", "/cuenta/retrato?v=0");
    expect(portrait).toHaveClass("size-avatar");
    expect(portrait.parentElement).toHaveClass("size-avatar", "rounded-full");
    expect(screen.getByRole("link", { name: /justo/i })).toHaveClass("items-center");
    expect(screen.getByRole("link", { name: /justo/i })).toHaveAttribute("href", "/cuenta");
    expect(screen.getByText("justo@ejemplo.invalid")).toHaveClass("px-identity-gutter");
  });

  it("sin foto propia usa la silueta genérica, no una cara inventada", () => {
    mockDeSesion.mockReturnValue({
      session: {
        status: "signed-in",
        displayName: null,
        email: "vecina@ejemplo.invalid",
        hasPortrait: false,
        staff: false,
        owner: false,
      },
      portraitSrc: null,
      refresh: () => undefined,
    });

    render(<WorkIdentity href="/cuenta" emptyName="Tu cuenta" />);

    expect(screen.getByRole("img", { name: "Tu cuenta" })).toHaveAttribute(
      "src",
      "/ui/retrato-vacio.svg",
    );
    expect(screen.getByRole("img", { name: "Tu cuenta" })).toHaveAttribute("width", "128");
  });
});
