import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BRANDS } from "@/content/brands";

import { DonorInviteShare } from "./donor-invite-share";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => (
    // El mock de next/image en jsdom: no hay un bundler que lo reemplace.
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} className={className} />
  ),
}));

const INVITE =
  "https://lacasadenorma.example/cuenta/confirmar?token_hash=abc&type=invite";
const EMAIL = "ana@ejemplo.com";
const PHONE = "11 1234-5678";

describe("DonorInviteShare", () => {
  it("muestra el correo, el enlace y el control para copiarlo", () => {
    render(<DonorInviteShare email={EMAIL} inviteUrl={INVITE} phone={PHONE} />);

    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(screen.getByText(INVITE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
  });

  it("con un teléfono plausible, WhatsApp lleva la marca y el enlace", () => {
    const html = renderToStaticMarkup(
      <DonorInviteShare email={EMAIL} inviteUrl={INVITE} phone={PHONE} />,
    );

    expect(html).toContain("WhatsApp");
    expect(html).toContain(BRANDS.whatsapp.src);
    expect(html).toContain("identifying-mark");
    expect(html).toContain("https://wa.me/5491112345678");
    expect(html).toContain(encodeURIComponent(INVITE));
  });

  it("sin teléfono no ofrece WhatsApp", () => {
    render(<DonorInviteShare email={EMAIL} inviteUrl={INVITE} />);

    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull();
  });

  it("con un teléfono que no alcanza, no inventa WhatsApp", () => {
    render(<DonorInviteShare email={EMAIL} inviteUrl={INVITE} phone="123" />);

    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull();
  });
});
