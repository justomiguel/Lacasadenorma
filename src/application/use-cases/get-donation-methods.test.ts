import { describe, expect, it } from "vitest";

import type { PaymentMethod } from "@/src/domain/entities";

import {
  contentOnlyLayer,
  fakeLogger,
  fakeSupabaseLayer,
} from "../test-support/fake-data-layer";
import { getDonationMethods } from "./get-donation-methods";

function method(partial: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: crypto.randomUUID(),
    kind: "bank_transfer",
    countryCode: "AR",
    currency: "ARS",
    label: "Transferencia en Argentina",
    fields: [
      { label: "CBU", value: "0000000000000000000000", copyable: true, hint: null },
    ],
    instructions: null,
    sortOrder: 1,
    ...partial,
  };
}

describe("getDonationMethods", () => {
  it("una lista vacía no es un error: significa que nada está verificado todavía", async () => {
    const result = await getDonationMethods({
      dataLayer: fakeSupabaseLayer({ paymentMethods: [] }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "ok", data: { methods: [], countries: [] } });
  });

  it("filtra por país cuando se pide uno", async () => {
    const result = await getDonationMethods({
      dataLayer: fakeSupabaseLayer({
        paymentMethods: [
          method({ countryCode: "AR" }),
          method({ countryCode: "CL", currency: "CLP" }),
          method({ countryCode: "US", currency: "USD" }),
        ],
      }),
      logger: fakeLogger(),
      country: "CL",
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data.methods).toHaveLength(1);
    expect(result.data.methods[0]?.countryCode).toBe("CL");
    // Los países disponibles se calculan sobre todos los publicados, no sobre el
    // filtro: el selector tiene que mostrar las tres opciones igual.
    expect(result.data.countries).toEqual(["AR", "CL", "US"]);
  });

  it("respeta el orden editorial y no el alfabético", async () => {
    const result = await getDonationMethods({
      dataLayer: fakeSupabaseLayer({
        paymentMethods: [
          method({ label: "Estados Unidos", countryCode: "US", sortOrder: 3 }),
          method({ label: "Argentina", countryCode: "AR", sortOrder: 1 }),
          method({ label: "Chile", countryCode: "CL", sortOrder: 2 }),
        ],
      }),
      logger: fakeLogger(),
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.data.methods.map((item) => item.label)).toEqual([
      "Argentina",
      "Chile",
      "Estados Unidos",
    ]);
  });

  it("sin base configurada no inventa datos bancarios", async () => {
    const result = await getDonationMethods({
      dataLayer: contentOnlyLayer,
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "not-configured" });
  });

  it("si la lectura falla no devuelve una cuenta parcial", async () => {
    const result = await getDonationMethods({
      dataLayer: fakeSupabaseLayer({ failWith: new Error("timeout") }),
      logger: fakeLogger(),
    });

    expect(result).toEqual({ status: "unavailable", reason: "error" });
  });
});
