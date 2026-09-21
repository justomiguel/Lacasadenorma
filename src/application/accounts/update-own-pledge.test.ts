import { describe, expect, it } from "vitest";

import type { DonationPledge } from "@/src/domain/entities/donation-pledge";
import type {
  ClaimInput,
  DonationsPort,
  UpdateOwnPledgeInput,
} from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";

import { updateOwnPledge } from "./update-own-pledge";

class FakeDonationsPort implements DonationsPort {
  cancelled: string | null = null;
  updated: UpdateOwnPledgeInput | null = null;
  failWith: Error | null = null;

  async claimItem(_input: ClaimInput): Promise<DonationPledge> {
    throw new Error("no se reserva desde esta prueba");
  }

  async listOwnPledges(): Promise<readonly DonationPledge[]> {
    return [];
  }

  async cancelOwnPledge(pledgeId: string): Promise<void> {
    if (this.failWith !== null) {
      throw this.failWith;
    }

    this.cancelled = pledgeId;
  }

  async updateOwnPledge(input: UpdateOwnPledgeInput): Promise<void> {
    if (this.failWith !== null) {
      throw this.failWith;
    }

    this.updated = input;
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

const PLEDGE = "30000000-0000-4000-8000-000000000001";

describe("updateOwnPledge", () => {
  it("manda cantidad y nota al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      { session: { status: "ready", port: {} as never, donations }, logger: silent },
      { pledgeId: PLEDGE, quantity: 2, note: "La dejo el sábado." },
    );

    expect(result).toEqual({ status: "ok", value: null });
    expect(donations.updated).toEqual({
      pledgeId: PLEDGE,
      quantity: 2,
      note: "La dejo el sábado.",
    });
  });

  it("sin sesión no llega al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      { session: { status: "anonymous" }, logger: silent },
      { pledgeId: PLEDGE, quantity: 2, note: null },
    );
    expect(result).toEqual({ status: "error", code: "noSession", field: null });
    expect(donations.updated).toBeNull();
  });

  it("cantidad 0 es quantityInvalid", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      { pledgeId: PLEDGE, quantity: 0, note: null },
    );
    expect(result).toEqual({
      status: "error",
      code: "quantityInvalid",
      field: "quantity",
    });
    expect(donations.updated).toBeNull();
  });

  it("NaN es quantityInvalid y no llega al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      { pledgeId: PLEDGE, quantity: Number.NaN, note: null },
    );
    expect(result).toEqual({
      status: "error",
      code: "quantityInvalid",
      field: "quantity",
    });
    expect(donations.updated).toBeNull();
  });

  it("cantidad no entera es quantityInvalid y no llega al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      { pledgeId: PLEDGE, quantity: 1.5, note: null },
    );
    expect(result).toEqual({
      status: "error",
      code: "quantityInvalid",
      field: "quantity",
    });
    expect(donations.updated).toBeNull();
  });

  it("nota vacía o solo espacios llega como null", async () => {
    const donations = new FakeDonationsPort();
    const result = await updateOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      { pledgeId: PLEDGE, quantity: 1, note: "   " },
    );

    expect(result).toEqual({ status: "ok", value: null });
    expect(donations.updated).toEqual({
      pledgeId: PLEDGE,
      quantity: 1,
      note: null,
    });
  });

  it("traduce sin_disponibilidad", async () => {
    const donations = new FakeDonationsPort();
    donations.failWith = new Error("editar la reserva: sin_disponibilidad (23514)");
    const result = await updateOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      { pledgeId: PLEDGE, quantity: 2, note: null },
    );
    expect(result).toEqual({ status: "error", code: "ahead", field: null });
  });
});
