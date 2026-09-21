import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminPledgeRecord } from "@/src/domain/entities/donation-pledge";

import { ActionForm, type ActionState } from "./form";
import { PledgeEditFields } from "./pledge-edit";

const noop = async (): Promise<ActionState> => ({
  status: "ok",
  value: {},
  message: "ok",
});

function reserved(partial: Partial<AdminPledgeRecord> = {}): AdminPledgeRecord {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    itemId: "44444444-4444-4444-8444-444444444444",
    itemTitle: "Chapas del techo",
    quantity: 2,
    status: "reserved",
    isAnonymous: true,
    donorDisplayName: null,
    donorNote: "Llego el sábado",
    contactName: "Ana",
    contactPhone: "3704123456",
    pickupAddress: null,
    expiresAt: "2026-10-04T00:00:00.000Z",
    remindedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: "2026-09-20T00:00:00.000Z",
    userId: null,
    contactEmail: null,
    coverChannel: "bring",
    ...partial,
  };
}

function renderFields(pledge: AdminPledgeRecord) {
  render(
    <ActionForm action={noop}>
      <PledgeEditFields pledge={pledge} />
    </ActionForm>,
  );
}

describe("PledgeEditFields", () => {
  it("una reserva por teléfono pide nombre y teléfono", () => {
    renderFields(reserved({ userId: null }));

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue("Ana");
    expect(screen.getByLabelText(/^teléfono$/i)).toHaveValue("3704123456");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("una reserva de cuenta no muestra nombre ni teléfono", () => {
    renderFields(
      reserved({
        userId: "66666666-6666-4666-8666-666666666666",
        contactName: "Ana",
        contactPhone: "3704123456",
      }),
    );

    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^teléfono$/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^cantidad$/i)).toHaveValue("2");
    expect(screen.getByLabelText(/^nota/i)).toHaveValue("Llego el sábado");
  });

  it("el envío dice Guardar cambios", () => {
    renderFields(reserved());

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });
});
