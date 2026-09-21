import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CatalogContent } from "@/content/schema";
import type { CatalogClaim, DonationItem, MediaAsset } from "@/src/domain/entities";
import { money } from "@/src/domain/money";

import { CatalogItem } from "./item";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

vi.mock("./cover", () => ({
  HowToDonate: () => <div data-howto="">cómo donar</div>,
}));

const COPY = {
  reservedPhoto: "Acá va una foto de {title}, cuando haya una.",
  covered: "Ya está cubierto.",
  remainingFact: "Faltan {remaining}",
  remainingOf: "de {needed} {unit}",
  estimatedUnit: "estimado {amount}, no fijo",
  columnTaken: "¿La tomó alguien?",
  columnName: "Nombre",
  takenYes: "Sí",
  takenNo: "No",
  nameNone: "—",
  namedShare: "{name} · {percent}",
  namedQuantity: "{name} · {quantity} {unit}",
  donorsLabel: "Quién tomó esto",
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
      alt: "Foto ilustrativa de Tina.",
      caption: "Foto solamente ilustrativa. No representa el objeto real.",
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

function renderItem(partial: Partial<DonationItem> = {}) {
  return render(
    <CatalogItem
      item={item(partial)}
      claims={[]}
      copy={COPY}
      account={{} as never}
      help={{} as never}
      ui={{} as never}
      locale="es"
      priority
    />,
  );
}

describe("CatalogItem", () => {
  it("muestra la foto de referencia cuando no hay una subida, con el epígrafe (ADR-043)", () => {
    const { container } = renderItem();

    expect(
      screen.getByRole("img", { name: /foto ilustrativa de tina/i }),
    ).toHaveAttribute("src", "/fotos/catalogo/tina.jpg");
    expect(screen.getByText(/solamente ilustrativa/i)).toBeInTheDocument();
    expect(screen.getByText(/no representa el objeto real/i)).toBeInTheDocument();
    expect(screen.queryByText(/acá va una foto/i)).not.toBeInTheDocument();
    // La ficha es LCP: si el revelado espera al observer, la foto queda en
    // opacity 0 y se lee el epígrafe sobre un hueco.
    expect(
      container.querySelector("[data-reveal-photo]")?.hasAttribute("data-in-view"),
    ).toBe(true);
  });

  it("la foto subida pisa la de referencia", () => {
    renderItem({ photo: uploaded() });

    expect(screen.getByRole("img", { name: /la tina que llegó/i })).toHaveAttribute(
      "src",
      "/storage/tina-real.jpg",
    );
    expect(screen.getByText("La que se entregó.")).toBeInTheDocument();
    expect(screen.queryByText(/solamente ilustrativa/i)).not.toBeInTheDocument();
  });

  it("sin foto subida ni de referencia reserva el hueco", () => {
    renderItem({ title: "Ítem de prueba sin ficha" });

    expect(
      screen.getByText(/acá va una foto de ítem de prueba sin ficha/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("el título es el h1, la foto va antes y no se habla como planilla", () => {
    const { container } = renderItem({
      remainingQuantity: 4,
      neededQuantity: 10,
      fulfilledQuantity: 0,
      estimatedValue: money(120_000, "ARS"),
    });

    const heading = screen.getByRole("heading", { level: 1, name: "Tina" });
    const photo = container.querySelector("[data-reveal-photo]");

    expect(photo).not.toBeNull();
    if (photo === null) {
      throw new Error("expected the item photo");
    }
    expect(
      photo.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.querySelector("[data-item-ficha]")).toHaveClass("lg:grid");
    expect(screen.getByText("Faltan 4")).toBeInTheDocument();
    expect(screen.getByText(/de 10 unidades/i)).toBeInTheDocument();
    expect(screen.getByText(/estimado/i)).toHaveTextContent(/no fijo/i);
    expect(screen.queryByText(/¿la tomó alguien\?/i)).not.toBeInTheDocument();
    expect(screen.getByText("Una bañera.")).toBeInTheDocument();
    expect(container.querySelector("[data-howto]")).not.toBeNull();
  });

  it("muestra el nombre de quien eligió aparecer, y no inventa uno si no hay", () => {
    const claims: CatalogClaim[] = [
      {
        id: "c1",
        itemId: "item-tina",
        quantity: 1,
        donorDisplayName: "María",
        fulfilledAt: null,
        hasPortrait: false,
      },
    ];

    render(
      <CatalogItem
        item={item({ remainingQuantity: 0, fulfilledQuantity: 0 })}
        claims={claims}
        copy={COPY}
        account={{} as never}
        help={{} as never}
        ui={{} as never}
        locale="es"
        priority
      />,
    );

    expect(screen.queryByText("Sí")).not.toBeInTheDocument();
    expect(screen.getByText("María · 1 unidad")).toBeInTheDocument();
    expect(screen.queryByText(/donó el/)).not.toBeInTheDocument();
  });

  it("una toma parcial nombra las unidades de ese ítem y sigue ofreciendo donar", () => {
    const claims: CatalogClaim[] = [
      {
        id: "c1",
        itemId: "item-tina",
        quantity: 5,
        donorDisplayName: "Ana",
        fulfilledAt: "2026-09-17T00:00:00.000Z",
        hasPortrait: false,
      },
    ];

    render(
      <CatalogItem
        item={item({
          neededQuantity: 10,
          remainingQuantity: 5,
          fulfilledQuantity: 5,
        })}
        claims={claims}
        copy={COPY}
        account={{} as never}
        help={{} as never}
        ui={{} as never}
        locale="es"
        priority
      />,
    );

    expect(screen.getByText("Ana · 5 unidades")).toBeInTheDocument();
    expect(screen.getByText("cómo donar")).toBeInTheDocument();
    expect(screen.getByText("Faltan 5")).toBeInTheDocument();
  });

  it("cubierto no ofrece caminos y omite el estimado si no hay", () => {
    renderItem();

    expect(screen.getByRole("heading", { level: 1, name: "Tina" })).toBeInTheDocument();
    expect(screen.getByText("Ya está cubierto.")).toBeInTheDocument();
    expect(screen.queryByText(/estimado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/¿la tomó alguien\?/i)).not.toBeInTheDocument();
    expect(screen.queryByText("cómo donar")).not.toBeInTheDocument();
  });
});
