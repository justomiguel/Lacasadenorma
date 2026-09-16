import { describe, expect, it } from "vitest";

import type { DonationOffer } from "@/src/domain/entities/donation-offer";
import type { OfferInput, OffersPort } from "@/src/domain/ports/donations";
import type { Logger } from "@/src/domain/ports/logger";

import { offerItemByPhone } from "./offer-item-by-phone";

class FakeOffersPort implements OffersPort {
  offered: OfferInput | null = null;
  failWith: Error | null = null;

  async offerItem(input: OfferInput): Promise<DonationOffer> {
    if (this.failWith !== null) {
      throw this.failWith;
    }

    this.offered = input;

    return {
      id: "40000000-0000-4000-8000-000000000001",
      itemId: input.itemId,
      itemTitle: "Chapas del techo",
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      createdAt: "2026-09-16T00:00:00.000Z",
      pledgeId: "50000000-0000-4000-8000-000000000001",
    };
  }
}

const silent: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const ITEM = "ab700000-0000-4000-8000-000000000003";

describe("offerItemByPhone", () => {
  it("persiste el aviso y avisa después, no antes", async () => {
    const offers = new FakeOffersPort();
    const avisos: string[] = [];

    const result = await offerItemByPhone(
      {
        offers,
        logger: silent,
        afterOffer: async (offer) => {
          avisos.push(offer.id);
        },
      },
      { itemId: ITEM, contactName: "Ana", contactPhone: "11 1234-5678" },
    );

    expect(result.status).toBe("ok");
    expect(offers.offered).toEqual({
      itemId: ITEM,
      contactName: "Ana",
      contactPhone: "11 1234-5678",
    });
    expect(avisos).toEqual(["40000000-0000-4000-8000-000000000001"]);
  });

  it("si el correo falla, el aviso igual queda", async () => {
    const offers = new FakeOffersPort();
    const result = await offerItemByPhone(
      {
        offers,
        logger: silent,
        afterOffer: async () => {
          throw new Error("resend caído");
        },
      },
      { itemId: ITEM, contactName: "Ana", contactPhone: "11 1234-5678" },
    );

    expect(result.status).toBe("ok");
    expect(offers.offered).not.toBeNull();
  });

  it("con mail no avisa por teléfono: ese camino abre una cuenta", async () => {
    const offers = new FakeOffersPort();
    const result = await offerItemByPhone(
      { offers, logger: silent },
      {
        itemId: ITEM,
        contactName: "Ana",
        contactPhone: "11 1234-5678",
        contactEmail: "ana@ejemplo.invalid",
      },
    );

    expect(result).toEqual({
      status: "error",
      code: "contactChannelRequired",
      field: "contactChannel",
    });
    expect(offers.offered).toBeNull();
  });

  it("sin disponibilidad no inventa el aviso", async () => {
    const offers = new FakeOffersPort();
    offers.failWith = new Error("avisar: sin_disponibilidad (23514)");

    const result = await offerItemByPhone(
      { offers, logger: silent },
      { itemId: ITEM, contactName: "Ana", contactPhone: "11 1234-5678" },
    );

    expect(result).toEqual({ status: "error", code: "ahead", field: null });
  });
});
