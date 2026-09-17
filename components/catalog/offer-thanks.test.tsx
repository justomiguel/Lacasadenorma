import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";

import { OfferThanksNotice } from "./offer-thanks";

describe("OfferThanksNotice", () => {
  it("confirma el gracias y que nos vamos a comunicar, sin un diálogo", () => {
    render(<OfferThanksNotice copy={getContent("es").catalog} />);

    const aviso = screen.getByRole("status");

    expect(aviso).toHaveAttribute("id", "gracias");
    expect(screen.getByRole("heading", { name: /gracias por donar/i })).toBeVisible();
    expect(screen.getByText(/nos vamos a estar comunicando con vos/i)).toBeVisible();
  });
});
