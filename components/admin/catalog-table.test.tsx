import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DonationItemAdminRecord } from "@/src/domain/entities";

import { CatalogAdminTable } from "./catalog-table";

const ITEM: DonationItemAdminRecord = {
  id: "44444444-4444-4444-8444-444444444444",
  campaignId: "11111111-1111-4111-8111-111111111111",
  budgetItemId: null,
  title: "Chapas del techo",
  description: null,
  unit: "unidad",
  category: "materiales",
  neededQuantity: 40,
  reservedQuantity: 0,
  fulfilledQuantity: 0,
  remainingQuantity: 40,
  estimatedValue: null,
  photo: null,
  photoMediaId: null,
  sortOrder: 10,
  publishedAt: "2026-09-16T00:00:00.000Z",
};

const noop = async () => ({ status: "ok" as const, value: {}, message: "ok" });

function renderTable(options: { canDelete: boolean; editingId: string | null }) {
  render(
    <CatalogAdminTable
      items={[ITEM]}
      editingId={options.editingId}
      canDelete={options.canDelete}
      fields={() => <p>formulario de edición</p>}
      saveAction={noop}
      deleteAction={noop}
    />,
  );
}

describe("CatalogAdminTable", () => {
  it("tiene la columna Acciones con ver y editar, y ver lleva a la ficha", () => {
    renderTable({ canDelete: false, editingId: null });

    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();

    const row = screen.getByRole("row", { name: /chapas del techo/i });

    expect(within(row).getByRole("link", { name: /ver ficha/i })).toHaveAttribute(
      "href",
      `/catalogo/${ITEM.id}`,
    );
    expect(within(row).getByRole("link", { name: /^editar$/i })).toHaveAttribute(
      "href",
      `/admin/catalogo?editar=${ITEM.id}#item-${ITEM.id}`,
    );
    expect(
      within(row).queryByRole("button", { name: /^borrar$/i }),
    ).not.toBeInTheDocument();
  });

  it("el owner ve borrar, y editar pone esa fila en modo edición", () => {
    renderTable({ canDelete: true, editingId: ITEM.id });

    expect(screen.getByRole("button", { name: /^borrar$/i })).toBeInTheDocument();
    expect(
      screen.getByText(/también se borran las reservas y los avisos/i),
    ).toBeInTheDocument();
    expect(screen.getByText("formulario de edición")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dejar de editar/i })).toHaveAttribute(
      "href",
      `/admin/catalogo#item-${ITEM.id}`,
    );
  });
});
