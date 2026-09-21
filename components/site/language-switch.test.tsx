import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content/pack";

import { LanguageSwitch } from "./language-switch";

vi.mock("next/navigation", () => ({
  usePathname: () => "/norma",
}));

describe("LanguageSwitch", () => {
  it("en castellano el inglés es el enlace y el actual no", () => {
    render(<LanguageSwitch locale="es" ui={getContent("es").ui} />);

    const ingles = screen.getByRole("link", { name: "English" });

    expect(ingles).toHaveAttribute("href", "/en/norma");
    expect(ingles).toHaveAttribute("hrefLang", "en");
    expect(screen.getByText("Castellano").closest("a")).toBeNull();
    expect(screen.getByText("Castellano").closest("[aria-current=true]")).not.toBeNull();
    expect(ingles.querySelector("[data-flag]")).not.toBeNull();
  });

  it("en inglés el castellano es el enlace", () => {
    render(<LanguageSwitch locale="en" ui={getContent("en").ui} />);

    const castellano = screen.getByRole("link", { name: "Castellano" });

    expect(castellano).toHaveAttribute("href", "/norma");
    expect(castellano).toHaveAttribute("hrefLang", "es-AR");
    expect(screen.queryByRole("link", { name: "English" })).toBeNull();
  });
});
