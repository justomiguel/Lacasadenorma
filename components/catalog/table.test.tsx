import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content";
import type { CatalogClaim, DonationItem, MediaAsset } from "@/src/domain/entities";
import { money } from "@/src/domain/money";

import { CatalogTable } from "./table";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

const COPY = getContent("es").catalog;

function uploaded(partial: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "media-1",
    kind: "photo",
    bucketId: "media",
    url: "/storage/tina-real.jpg",
    alt: "La tina que llegó a la obra.",
    caption: "La que se entregó.",
    credit: "El equipo",
    width: 800,
    height: 600,
    takenOn: null,
    posterUrl: null,
    posterWidth: null,
    posterHeight: null,
    ...partial,
  };
}

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
    expect(screen.getByRole("table")).toHaveAccessibleName(
      /fotos no representan el objeto real/i,
    );
  });

  it("muestra la foto de referencia en Qué, y no reserva un hueco si no hay", () => {
    const { rerender } = render(
      <CatalogTable
        items={[item({ title: "Bidet" })]}
        claims={[]}
        copy={COPY}
        locale="es"
      />,
    );

    expect(
      screen.getByRole("img", { name: /foto ilustrativa de bidet/i }),
    ).toHaveAttribute("src", "/fotos/catalogo/bidet.jpg");
    expect(screen.queryByText(/acá va una foto/i)).not.toBeInTheDocument();

    rerender(
      <CatalogTable
        items={[item({ title: "Un ítem que no está en el JSON" })]}
        claims={[]}
        copy={COPY}
        locale="es"
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/acá va una foto/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Un ítem que no está en el JSON" }),
    ).toBeInTheDocument();
  });

  it("en el listado la foto subida pisa la de referencia", () => {
    render(
      <CatalogTable
        items={[item({ photo: uploaded() })]}
        claims={[]}
        copy={COPY}
        locale="es"
      />,
    );

    expect(
      screen.getByRole("img", { name: /la tina que llegó a la obra/i }),
    ).toHaveAttribute("src", "/storage/tina-real.jpg");
    expect(
      screen.queryByRole("img", { name: /foto ilustrativa/i }),
    ).not.toBeInTheDocument();
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
