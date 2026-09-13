import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content/pack";

import { ContactActions } from "./contact-actions";

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

describe("ContactActions", () => {
  it("muestra el retrato de Justo en círculo", () => {
    render(
      <ContactActions
        name={help.contact.name}
        photo={help.contact.photo}
        phoneDisplay={help.contact.phoneDisplay}
        phoneTel={help.contact.phoneTel}
        email={help.contact.email}
        instagram={help.contact.instagram}
        whatsappLabel={ui.contactPage.whatsapp}
        callLabel={ui.contactPage.call}
        emailLabel={ui.contactPage.email}
        instagramLabel={ui.contactPage.instagram}
        origen="contacto"
      />,
    );

    const retrato = screen.getByRole("img", { name: help.contact.photo.alt });

    expect(retrato).toHaveAttribute("src", "/fotos/justo-miguel.jpg");
    expect(retrato.className, "un retrato chico, no un avatar").toMatch(/rounded-sm/);
    expect(retrato.className).not.toMatch(/rounded-full/);
    expect(retrato.className).toMatch(/object-cover/);
  });
});
