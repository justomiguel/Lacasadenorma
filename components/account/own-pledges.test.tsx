import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content";
import type { DonationItem, MediaAsset, OwnPledge } from "@/src/domain/entities";
import type { PledgeStatus } from "@/src/domain/pledge-status";

import { OwnPledges } from "./own-pledges";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/app/(es)/catalogo/actions", () => ({
  cancelOwnPledgeAction: vi.fn(),
  updateOwnPledgeAction: vi.fn(),
}));

const ACCOUNT = getContent("es").account.profile;
const CATALOG = getContent("es").catalog;

function uploaded(partial: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "media-1",
    kind: "photo",
    bucketId: "media",
    url: "/storage/heladera-real.jpg",
    alt: "La heladera que se entregó.",
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
    id: "item-heladera",
    campaignId: "camp-1",
    budgetItemId: null,
    title: "Heladera",
    description: null,
    unit: "unidad",
    category: "electrodomesticos",
    neededQuantity: 2,
    remainingQuantity: 1,
    fulfilledQuantity: 0,
    estimatedValue: null,
    photo: null,
    sortOrder: 10,
    ...partial,
  };
}

function pledge(partial: Partial<OwnPledge> = {}): OwnPledge {
  return {
    id: "pledge-1",
    itemId: "item-heladera",
    itemTitle: "Heladera",
    quantity: 1,
    status: "reserved",
    isAnonymous: true,
    donorDisplayName: null,
    donorNote: null,
    contactName: "Ana",
    contactPhone: "3704123456",
    pickupAddress: "Riacho He Hé",
    expiresAt: "2026-10-04T00:00:00.000Z",
    remindedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: "2026-09-20T00:00:00.000Z",
    ...partial,
  };
}

function renderPledges(
  pledges: readonly OwnPledge[],
  items: readonly DonationItem[] = [],
) {
  return render(
    <OwnPledges
      pledges={pledges}
      items={items}
      copy={ACCOUNT}
      catalog={CATALOG}
      locale="es"
    />,
  );
}

describe("OwnPledges", () => {
  it("una anotada muestra foto, ficha, vencimiento, lo que falta y cancelar", () => {
    renderPledges([pledge()], [item({ photo: uploaded() })]);

    expect(
      screen.getByRole("img", { name: /la heladera que se entregó/i }),
    ).toHaveAttribute("src", "/storage/heladera-real.jpg");
    expect(screen.getByRole("link", { name: "Heladera" })).toHaveAttribute(
      "href",
      "/catalogo/item-heladera",
    );
    expect(
      screen.getByText(/1 unidad\.\s+vence el 4 de octubre de 2026/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/faltan 1/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancelar esta reserva/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/contacto/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/riacho/i)).not.toBeInTheDocument();
  });

  it("reserved ofrece cantidad, nota y guardar", () => {
    renderPledges([pledge()], [item({ neededQuantity: 4, remainingQuantity: 3 })]);

    expect(screen.getByLabelText(/^cuántas$/i)).toHaveValue(1);
    expect(screen.getByLabelText(/nota para la familia/i)).toHaveAttribute(
      "maxLength",
      "500",
    );
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancelar esta reserva/i }),
    ).toBeInTheDocument();
  });

  it("accepted no ofrece editar", () => {
    renderPledges([pledge({ status: "accepted" })], [item()]);

    expect(screen.queryByLabelText(/^cuántas$/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /guardar cambios/i }),
    ).not.toBeInTheDocument();
  });

  it("una tomada dice pendiente de entrega y no ofrece cancelar", () => {
    renderPledges([pledge({ status: "accepted" })], [item()]);

    expect(screen.getByText(/1 unidad\.\s+pendiente de entrega/i)).toBeInTheDocument();
    expect(screen.queryByText(/llegó/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it("una llegada dice gracias y no ofrece cancelar", () => {
    renderPledges(
      [pledge({ status: "fulfilled" })],
      [item({ remainingQuantity: 0, fulfilledQuantity: 2 })],
    );

    expect(screen.getByText(/1 unidad\.\s+llegó\. gracias/i)).toBeInTheDocument();
    expect(screen.getByText(CATALOG.covered)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it("canceladas y vencidas no se listan", () => {
    const hidden: PledgeStatus[] = ["cancelled", "expired"];

    renderPledges(hidden.map((status, index) => pledge({ id: `p-${index}`, status })));

    expect(screen.queryByText("Heladera")).not.toBeInTheDocument();
    expect(screen.getByText(ACCOUNT.pledgesEmpty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: CATALOG.title })).toHaveAttribute(
      "href",
      "/catalogo",
    );
  });

  it("sin el ítem en el catálogo usa la foto de referencia y omite el hecho del ítem", () => {
    renderPledges([pledge({ itemTitle: "Bidet", itemId: "item-ausente" })]);

    expect(
      screen.getByRole("img", { name: /foto ilustrativa de bidet/i }),
    ).toHaveAttribute("src", "/fotos/catalogo/bidet.jpg");
    expect(screen.getByRole("link", { name: "Bidet" })).toHaveAttribute(
      "href",
      "/catalogo/item-ausente",
    );
    expect(screen.getByText(/vence el/i)).toBeInTheDocument();
    expect(screen.queryByText(/faltan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(CATALOG.covered)).not.toBeInTheDocument();
  });

  it("sin foto no reserva un hueco", () => {
    renderPledges([pledge({ itemTitle: "Un ítem que no está en el JSON" })]);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/acá va una foto/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Un ítem que no está en el JSON" }),
    ).toBeInTheDocument();
  });
});
