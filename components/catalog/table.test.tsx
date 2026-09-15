import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getContent } from "@/content";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import { money } from "@/src/domain/money";

import { CatalogTable } from "./table";

const COPY = getContent("es").catalog;

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
    estimatedValue: null,
    photo: null,
    sortOrder: 10,
    ...partial,
  };
}

describe("CatalogTable", () => {
  it("es una tabla con encabezados también sin apilar, y un quiero donar por fila", () => {
    render(<CatalogTable items={[item()]} claims={[]} copy={COPY} locale="es" />);

    expect(screen.getByRole("table")).toHaveAccessibleName(/lo que falta/i);
    expect(screen.getByRole("columnheader", { name: "Qué" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cantidad" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "¿La tomó alguien?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Nombre" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Estimado por unidad" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Estimado total" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Donar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tina" })).toHaveAttribute(
      "href",
      "/catalogo/item-tina",
    );
    expect(screen.getByRole("link", { name: /quiero donar tina/i })).toHaveAttribute(
      "href",
      "/catalogo/item-tina",
    );
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("publica el estimado por unidad y el total de lo que falta, etiquetado en el caption", () => {
    render(
      <CatalogTable
        items={[
          item({
            neededQuantity: 4,
            remainingQuantity: 3,
            estimatedValue: money(10_000, "ARS"),
          }),
        ]}
        claims={[]}
        copy={COPY}
        locale="es"
      />,
    );

    expect(screen.getByText("$ 100")).toBeInTheDocument();
    expect(screen.getByText("$ 300")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveAccessibleName(/no es un precio fijo/i);
  });

  it("un ítem cubierto no ofrece donar ni inventa un total", () => {
    render(
      <CatalogTable
        items={[
          item({
            remainingQuantity: 0,
            fulfilledQuantity: 1,
            estimatedValue: money(10_000, "ARS"),
          }),
        ]}
        claims={[]}
        copy={COPY}
        locale="es"
      />,
    );

    expect(screen.queryByRole("link", { name: /quiero donar/i })).not.toBeInTheDocument();
    expect(screen.getByText("$ 100")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
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
