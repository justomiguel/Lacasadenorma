import { describe, expect, it } from "vitest";

import { parsePhysicalPledgeContact } from "./pledge-contact";

describe("parsePhysicalPledgeContact", () => {
  it("pide nombre; el teléfono y la dirección pueden faltar", () => {
    expect(
      parsePhysicalPledgeContact({
        contactName: "  Ana  ",
        contactPhone: "   ",
        pickupAddress: "  Riacho He Hé, Formosa  ",
      }),
    ).toEqual({
      status: "ok",
      value: {
        contactName: "Ana",
        contactPhone: null,
        pickupAddress: "Riacho He Hé, Formosa",
      },
    });
  });

  it("guarda el teléfono si lo hay", () => {
    const parsed = parsePhysicalPledgeContact({
      contactName: "Ana",
      contactPhone: "3704 000000",
      pickupAddress: "Riacho He Hé, Formosa",
    });

    expect(parsed.status).toBe("ok");
    if (parsed.status === "ok") {
      expect(parsed.value.contactPhone).toBe("3704 000000");
    }
  });

  it("sin nombre señala el campo", () => {
    expect(
      parsePhysicalPledgeContact({
        contactName: "   ",
        contactPhone: null,
        pickupAddress: "Riacho He Hé, Formosa",
      }),
    ).toEqual({ status: "error", field: "contactName" });
  });

  it("sin dirección igual alcanza: la ficha ya no la pide", () => {
    expect(
      parsePhysicalPledgeContact({
        contactName: "Ana",
        contactPhone: null,
        pickupAddress: "",
      }),
    ).toEqual({
      status: "ok",
      value: { contactName: "Ana", contactPhone: null, pickupAddress: null },
    });
  });
});
