import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CatalogContent } from "@/content/schema";
import type { DonationItem, MediaAsset } from "@/src/domain/entities";

import { CatalogItem } from "./item";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

const COPY = {
  reservedPhoto: "Acá va una foto de {title}, cuando haya una.",
  covered: "Ya está cubierto.",
  quantityOf: "Faltan {remaining} de {needed} {unit}.",
  columnTaken: "¿La tomó alguien?",
  columnName: "Nombre",
  takenYes: "Sí",
  takenNo: "No",
  nameNone: "—",
  units: {
    unidad: { one: "unidad", other: "unidades" },
    metro: { one: "metro", other: "metros" },
    metro_cuadrado: { one: "metro cuadrado", other: "metros cuadrados" },
    metro_cubico: { one: "metro cúbico", other: "metros cúbicos" },
    bolsa: { one: "bolsa", other: "bolsas" },
    litro: { one: "litro", other: "litros" },
    juego: { one: "juego", other: "juegos" },
  },
  referencePhotos: {
    Tina: {
      url: "/fotos/catalogo/tina.jpg",
      alt: "Foto de referencia: Tina.",
      caption:
        "Foto de referencia de Tina. Muestra el tipo de material u objeto, no una compra de esta casa.",
      credit: "Alguien, vía Openverse (CC0)",
      width: 1200,
      height: 800,
      takenOn: null,
    },
  },
} as unknown as CatalogContent;

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
    remainingQuantity: 0,
    fulfilledQuantity: 1,
    estimatedValue: null,
    photo: null,
    sortOrder: 10,
    ...partial,
  };
}

describe("CatalogItem", () => {
  it("muestra la foto de referencia cuando no hay una subida, con el epígrafe (ADR-042)", () => {
    render(
      <CatalogItem
        item={item()}
        claims={[]}
        copy={COPY}
        account={{} as never}
        help={{} as never}
        ui={{} as never}
        locale="es"
      />,
    );

    expect(
      screen.getByRole("img", { name: /foto de referencia: tina/i }),
    ).toHaveAttribute("src", "/fotos/catalogo/tina.jpg");
    expect(screen.getByText(/foto de referencia de tina/i)).toBeInTheDocument();
    expect(screen.queryByText(/acá va una foto/i)).not.toBeInTheDocument();
  });

  it("la foto subida pisa la de referencia", () => {
    render(
      <CatalogItem
        item={item({ photo: uploaded() })}
        claims={[]}
        copy={COPY}
        account={{} as never}
        help={{} as never}
        ui={{} as never}
        locale="es"
      />,
    );

    expect(screen.getByRole("img", { name: /la tina que llegó/i })).toHaveAttribute(
      "src",
      "/storage/tina-real.jpg",
    );
    expect(screen.getByText("La que se entregó.")).toBeInTheDocument();
    expect(screen.queryByText(/foto de referencia de tina/i)).not.toBeInTheDocument();
  });

  it("sin foto subida ni de referencia reserva el hueco", () => {
    render(
      <CatalogItem
        item={item({ title: "Ítem de prueba sin ficha" })}
        claims={[]}
        copy={COPY}
        account={{} as never}
        help={{} as never}
        ui={{} as never}
        locale="es"
      />,
    );

    expect(
      screen.getByText(/acá va una foto de ítem de prueba sin ficha/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
