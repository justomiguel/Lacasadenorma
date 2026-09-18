import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";

import { OfferThanksNotice } from "./offer-thanks";

const { catalog } = getContent("es");

describe("OfferThanksNotice", () => {
  it("es un diálogo centrado que tapa la ficha y agradece", () => {
    render(<OfferThanksNotice copy={catalog} dismissHref="/catalogo/item" />);

    const dialogo = screen.getByRole("dialog", { name: /gracias por donar/i });

    expect(dialogo).toHaveAttribute("id", "gracias");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: /gracias por donar/i })).toBeVisible();
    expect(screen.getByText(/nos vamos a estar comunicando con vos/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /^entendido$/i })).toHaveAttribute(
      "href",
      "/catalogo/item",
    );
    expect(screen.getByRole("link", { name: /^cerrar$/i })).toHaveAttribute(
      "href",
      "/catalogo/item",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
