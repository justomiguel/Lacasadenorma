import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content/pack";

import { DonationBoard } from "./donation-board";

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
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} className={className} />
  ),
}));

const { help, ui } = getContent("es");

describe("DonationBoard sin JavaScript", () => {
  it("el HTML servido trae los dos Mercado Pago y PayPal, cada uno con su URL", () => {
    const html = renderToStaticMarkup(<DonationBoard help={help} ui={ui} />);

    expect(html).toContain("https://link.mercadopago.com.ar/donacionescasanorma");
    expect(html).toContain("https://link.mercadopago.cl/donacioneschile");
    expect(html).toContain(
      "https://www.paypal.com/donate/?hosted_button_id=CMMPSBKNA5ZKL",
    );
    expect(html).toContain(`${ui.home.mercadoPagoCta} ${ui.countries.AR}`);
    expect(html).toContain(`${ui.home.mercadoPagoCta} ${ui.countries.CL}`);
    expect(html).toContain(ui.home.paypalCta);
  });
});

describe("DonationBoard hidratado", () => {
  it("Mercado Pago tiene un enlace de Argentina y otro de Chile", async () => {
    const user = userEvent.setup();

    render(<DonationBoard help={help} ui={ui} />);

    await user.click(screen.getByRole("tab", { name: ui.home.mercadoPago }));

    const argentina = screen.getByRole("link", {
      name: new RegExp(`${ui.home.mercadoPagoCta} ${ui.countries.AR}`),
    });
    const chile = screen.getByRole("link", {
      name: new RegExp(`${ui.home.mercadoPagoCta} ${ui.countries.CL}`),
    });

    expect(argentina).toHaveAttribute(
      "href",
      "https://link.mercadopago.com.ar/donacionescasanorma",
    );
    expect(chile).toHaveAttribute("href", "https://link.mercadopago.cl/donacioneschile");
  });

  it("PayPal tiene el enlace de donación", async () => {
    const user = userEvent.setup();

    render(<DonationBoard help={help} ui={ui} />);

    await user.click(screen.getByRole("tab", { name: ui.home.paypal }));

    expect(
      screen.getByRole("link", { name: new RegExp(ui.home.paypalCta) }),
    ).toHaveAttribute(
      "href",
      "https://www.paypal.com/donate/?hosted_button_id=CMMPSBKNA5ZKL",
    );
  });
});
