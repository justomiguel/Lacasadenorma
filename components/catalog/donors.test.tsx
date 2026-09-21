import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CatalogContent } from "@/content/schema";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";

import { CatalogDonors } from "./donors";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

const COPY = {
  donorsLabel: "Quién tomó esto",
  namedShare: "{name} · {percent}",
  namedQuantity: "{name} · {quantity} {unit}",
  units: {
    unidad: { one: "unidad", other: "unidades" },
    metro: { one: "metro", other: "metros" },
    metro_cuadrado: { one: "metro cuadrado", other: "metros cuadrados" },
    metro_cubico: { one: "metro cúbico", other: "metros cúbicos" },
    bolsa: { one: "bolsa", other: "bolsas" },
    litro: { one: "litro", other: "litros" },
    juego: { one: "juego", other: "juegos" },
  },
} as unknown as CatalogContent;

function item(partial: Partial<DonationItem> = {}): DonationItem {
  return {
    id: "item-tina",
    campaignId: "camp-1",
    budgetItemId: null,
    title: "Tina",
    description: null,
    unit: "bolsa",
    category: "materiales",
    neededQuantity: 10,
    remainingQuantity: 6,
    fulfilledQuantity: 4,
    estimatedValue: null,
    photo: null,
    sortOrder: 1,
    ...partial,
  };
}

function claim(partial: Partial<CatalogClaim> = {}): CatalogClaim {
  return {
    id: "c1",
    itemId: "item-tina",
    quantity: 4,
    donorDisplayName: "Ana",
    fulfilledAt: null,
    hasPortrait: false,
    ...partial,
  };
}

describe("CatalogDonors", () => {
  it("sin nombres no pinta el bloque", () => {
    const { container } = render(
      <CatalogDonors
        item={item({ remainingQuantity: 10, fulfilledQuantity: 0 })}
        claims={[]}
        copy={COPY}
        locale="es"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("bolsas: nombre y cantidad; sin img si no hay foto", () => {
    render(<CatalogDonors item={item()} claims={[claim()]} copy={COPY} locale="es" />);
    expect(screen.getByRole("list", { name: /quién tomó esto/i })).toBeInTheDocument();
    expect(screen.getByText("Ana · 4 bolsas")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("con foto: img a la ruta de esa reserva, alt vacío", () => {
    render(
      <CatalogDonors
        item={item()}
        claims={[claim({ hasPortrait: true })]}
        copy={COPY}
        locale="es"
      />,
    );
    const photo = screen.getByAltText("");
    expect(photo).toHaveAttribute("src", "/catalogo/retrato/c1");
    expect(photo).toHaveAttribute("alt", "");
  });

  it("metros: %; en /en la ruta lleva prefijo", () => {
    render(
      <CatalogDonors
        item={item({ unit: "metro", remainingQuantity: 6 })}
        claims={[claim()]}
        copy={COPY}
        locale="en"
      />,
    );
    expect(screen.getByText("Ana · 40%")).toBeInTheDocument();
    render(
      <CatalogDonors
        item={item()}
        claims={[claim({ id: "c2", hasPortrait: true })]}
        copy={COPY}
        locale="en"
      />,
    );
    expect(screen.getByAltText("")).toHaveAttribute("src", "/en/catalogo/retrato/c2");
  });
});
