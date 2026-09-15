import { describe, expect, it } from "vitest";

import type { DonationPledge } from "@/src/domain/entities/donation-pledge";
import type { ClaimInput, DonationsPort } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";

import { claimItem } from "./claim-item";

class FakeDonationsPort implements DonationsPort {
  claimed: ClaimInput | null = null;
  failWith: Error | null = null;
  itemTitle = "Chapas del techo";

  async claimItem(input: ClaimInput): Promise<DonationPledge> {
    if (this.failWith !== null) {
      throw this.failWith;
    }

    this.claimed = input;

    return {
      id: "30000000-0000-4000-8000-000000000001",
      itemId: input.itemId,
      itemTitle: this.itemTitle,
      quantity: input.quantity,
      status: "reserved",
      isAnonymous: input.isAnonymous,
      donorDisplayName: input.displayName,
      donorNote: input.note,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      pickupAddress: input.pickupAddress,
      expiresAt: "2026-09-27T00:00:00.000Z",
      remindedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: "2026-09-13T00:00:00.000Z",
    };
  }

  async listOwnPledges(): Promise<readonly DonationPledge[]> {
    return [];
  }

  async cancelOwnPledge(): Promise<void> {
    return;
  }

  async updateOwnAppearance(): Promise<void> {
    return;
  }
}

const silent: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const ITEM = "ab700000-0000-4000-8000-000000000003";

const TRAER = {
  contactName: "Ana",
  contactPhone: null as string | null,
  pickupAddress: "Riacho He Hé, Formosa",
};

function ready(donations: DonationsPort) {
  return {
    session: {
      status: "ready" as const,
      port: {} as never,
      donations,
    },
    logger: silent,
  };
}

describe("claimItem", () => {
  it("reserva y avisa después, no antes", async () => {
    const donations = new FakeDonationsPort();
    const avisos: string[] = [];

    const result = await claimItem(
      {
        ...ready(donations),
        afterClaim: async (pledge) => {
          avisos.push(pledge.id);
        },
      },
      { itemId: ITEM, quantity: 1, anonymous: "si", ...TRAER },
    );

    expect(result.status).toBe("ok");
    expect(donations.claimed).toMatchObject({
      itemId: ITEM,
      quantity: 1,
      isAnonymous: true,
      coverChannel: "bring",
      contactName: "Ana",
      pickupAddress: "Riacho He Hé, Formosa",
    });
    expect(avisos).toEqual(["30000000-0000-4000-8000-000000000001"]);
  });

  it("si el aviso falla, la reserva igual queda", async () => {
    const donations = new FakeDonationsPort();
    const result = await claimItem(
      {
        ...ready(donations),
        afterClaim: async () => {
          throw new Error("resend caído");
        },
      },
      { itemId: ITEM, quantity: "1", anonymous: "si", ...TRAER },
    );

    expect(result.status).toBe("ok");
    expect(donations.claimed).not.toBeNull();
  });

  it("sin sesión no llega al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await claimItem(
      { session: { status: "anonymous" }, logger: silent },
      { itemId: ITEM, quantity: 1 },
    );

    expect(result).toEqual({ status: "error", code: "noSession", field: null });
    expect(donations.claimed).toBeNull();
  });

  it("traduce sin_disponibilidad al estado diseñado", async () => {
    const donations = new FakeDonationsPort();
    donations.failWith = new Error("reservar: sin_disponibilidad (23514)");

    const result = await claimItem(ready(donations), {
      itemId: ITEM,
      quantity: 1,
      anonymous: "si",
      ...TRAER,
    });

    expect(result).toEqual({ status: "error", code: "ahead", field: null });
  });

  it("pedir aparecer sin nombre se rechaza antes de llamar", async () => {
    const donations = new FakeDonationsPort();
    const result = await claimItem(ready(donations), {
      itemId: ITEM,
      quantity: 1,
      anonymous: "no",
      displayName: "   ",
      ...TRAER,
    });

    expect(result).toEqual({
      status: "error",
      code: "displayNameRequired",
      field: "displayName",
    });
    expect(donations.claimed).toBeNull();
  });

  it("una cantidad que no es un entero positivo señala el campo", async () => {
    const donations = new FakeDonationsPort();
    const result = await claimItem(ready(donations), {
      itemId: ITEM,
      quantity: "0",
      anonymous: "si",
    });

    expect(result).toEqual({
      status: "error",
      code: "quantityInvalid",
      field: "quantity",
    });
    expect(donations.claimed).toBeNull();
  });

  it("sin nombre de contacto no llega al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await claimItem(ready(donations), {
      itemId: ITEM,
      quantity: 1,
      anonymous: "si",
      pickupAddress: TRAER.pickupAddress,
    });

    expect(result).toEqual({
      status: "error",
      code: "contactNameRequired",
      field: "contactName",
    });
    expect(donations.claimed).toBeNull();
  });

  it("sin dirección de retiro no llega al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await claimItem(ready(donations), {
      itemId: ITEM,
      quantity: 1,
      anonymous: "si",
      contactName: "Ana",
    });

    expect(result).toEqual({
      status: "error",
      code: "pickupAddressRequired",
      field: "pickupAddress",
    });
    expect(donations.claimed).toBeNull();
  });

  it("cubrir con plata no reserva: la transacción es la prueba", async () => {
    const donations = new FakeDonationsPort();
    const result = await claimItem(ready(donations), {
      itemId: ITEM,
      quantity: 1,
      anonymous: "si",
      coverChannel: "mercadopago",
    });

    expect(result).toEqual({
      status: "error",
      code: "coverIsNotAPledge",
      field: null,
    });
    expect(donations.claimed).toBeNull();
  });
});
