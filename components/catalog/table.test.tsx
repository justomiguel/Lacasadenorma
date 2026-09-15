import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatalogContent } from "@/content/schema";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";

import { CatalogTable } from "./table";

const COPY = {
  tableCaption: "Lo que falta, cuánto, y si alguien ya se anotó.",
  columnItem: "Qué",
  columnQuantity: "Cantidad",
  columnTaken: "¿La tomó alguien?",
  columnName: "Nombre",
  takenYes: "Sí",
  takenNo: "No",
  nameNone: "—",
  quantityOf: "Faltan {remaining} de {needed} {unit}.",
  covered: "Ya está cubierto.",
  units: {
    unidad: { one: "unidad", other: "unidades" },
    metro: { one: "metro", other: "metros" },
    metro_cuadrado: { one: "metro cuadrado", other: "metros cuadrados" },
    metro_cubico: { one: "metro cúbico", other: "metros cúbicos" },
    bolsa: { one: "bolsa", other: "bolsas" },
    litro: { one: "litro", other: "litros" },
    juego: { one: "juego", other: "juegos" },
  },
} as CatalogContent;

function item(partial: Partial<DonationItem> = {}): DonationItem {
  return {
    id: "item-tina",
    campaignId: "camp-1",
    budgetItemId: null,
    title: "Tina",
    description: "Una bañera.",
    unit: "unidad",
    category: "instalaciones",
    neededQuantity: 1,
    remainingQuantity: 1,
    fulfilledQuantity: 0,
    photo: null,
    sortOrder: 10,
    ...partial,
  };
}

describe("CatalogTable", () => {
  it("es una tabla con encabezados, no un listado que se parece a una", () => {
    render(<CatalogTable items={[item()]} claims={[]} copy={COPY} locale="es" />);

    expect(screen.getByRole("table")).toHaveAccessibleName(/lo que falta/i);
    expect(screen.getByRole("columnheader", { name: "Qué" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cantidad" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "¿La tomó alguien?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Nombre" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tina" })).toHaveAttribute(
      "href",
      "/catalogo/item-tina",
    );
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("muestra el nombre de quien eligió aparecer, y no inventa uno si no hay", () => {
    const claims: CatalogClaim[] = [
      {
        id: "c1",
        itemId: "item-tina",
        quantity: 1,
        donorDisplayName: "María",
        fulfilledAt: null,
      },
    ];

    render(
      <CatalogTable
        items={[item({ remainingQuantity: 0, fulfilledQuantity: 0 })]}
        claims={claims}
        copy={COPY}
        locale="es"
      />,
    );

    expect(screen.getByText("Sí")).toBeInTheDocument();
    expect(screen.getByText("María")).toBeInTheDocument();
  });
});
