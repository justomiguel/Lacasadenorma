import { describe, expect, it } from "vitest";

import type { DonationPledge } from "@/src/domain/entities/donation-pledge";
import type { ClaimInput, DonationsPort } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";

import { cancelOwnPledge } from "./cancel-own-pledge";

class FakeDonationsPort implements DonationsPort {
  cancelled: string | null = null;
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

describe("cancelOwnPledge", () => {
  it("cancela la reserva propia", async () => {
    const donations = new FakeDonationsPort();
    const result = await cancelOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      PLEDGE,
    );

    expect(result).toEqual({ status: "ok", value: null });
    expect(donations.cancelled).toBe(PLEDGE);
  });

  it("sin sesión no llega al puerto", async () => {
    const donations = new FakeDonationsPort();
    const result = await cancelOwnPledge(
      { session: { status: "anonymous" }, logger: silent },
      PLEDGE,
    );

    expect(result).toEqual({ status: "error", code: "noSession", field: null });
    expect(donations.cancelled).toBeNull();
  });

  it("traduce no_encontrada", async () => {
    const donations = new FakeDonationsPort();
    donations.failWith = new Error("cancelar la reserva: no_encontrada (P0002)");

    const result = await cancelOwnPledge(
      {
        session: { status: "ready", port: {} as never, donations },
        logger: silent,
      },
      PLEDGE,
    );

    expect(result).toEqual({ status: "error", code: "alreadyGone", field: null });
  });
});
