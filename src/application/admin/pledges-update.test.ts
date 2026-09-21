import { describe, expect, it } from "vitest";

import { PledgeContactRequiredError, PledgeUnavailableError } from "@/src/domain/errors";

import { fakeAdminGateway } from "../test-support/fake-admin-gateway";
import { RECORD, deps } from "./admin-test-helpers";
import { recordDonorArrival, updatePledge } from "./pledges";

const PLEDGE = RECORD;
const CUENTA = "20000000-0000-4000-8000-000000000006";
const ITEM = RECORD;

describe("updatePledge", () => {
  it("edita y deja rastro pledge.updated", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await updatePledge(
      admin,
      { id: PLEDGE, quantity: "2", nota: "Sábado." },
      null,
    );

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "updatePledge")).toMatchObject({
      input: {
        id: PLEDGE,
        quantity: 2,
        note: "Sábado.",
        contactName: null,
        contactPhone: null,
      },
    });
    expect(fake.audit[0]).toMatchObject({
      action: "pledge.updated",
      entityTable: "donation_pledges",
      entityId: PLEDGE,
    });
  });

  it("cantidad 0 no llega al puerto", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await updatePledge(admin, { id: PLEDGE, quantity: "0" }, null);
    expect(result.status).toBe("invalid");
    expect(fake.calls.find((call) => call.name === "updatePledge")).toBeUndefined();
  });

  it("rechaza a un editor y no toca el puerto", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await updatePledge(
      editor,
      { id: PLEDGE, quantity: "2", nota: "Sábado." },
      null,
    );

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
    expect(fake.audit).toEqual([]);
  });

  it("sin_disponibilidad es invalid en quantity, no el fallo genérico", async () => {
    const gateway = fakeAdminGateway({ failWith: new PledgeUnavailableError() });
    const { deps: admin } = deps("admin", gateway);
    const result = await updatePledge(admin, { id: PLEDGE, quantity: "2" }, null);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;

    expect(result.message).toBe("Alguien se adelantó.");
    expect(result.fieldErrors.quantity).toBe("Alguien se adelantó.");
    expect(result.message).not.toMatch(/No se pudo editar/);
  });

  it("datos_de_retiro es invalid en nombre y teléfono, no el fallo genérico", async () => {
    const error = new PledgeContactRequiredError();
    const gateway = fakeAdminGateway({ failWith: error });
    const { deps: admin } = deps("admin", gateway);
    const result = await updatePledge(
      admin,
      { id: PLEDGE, quantity: "1", contactName: "Ana", contactPhone: "11 1234-5678" },
      null,
    );

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;

    expect(result.message).toBe(error.message);
    expect(result.fieldErrors.contactName).toBe(error.message);
    expect(result.fieldErrors.contactPhone).toBe(error.message);
    expect(result.message).not.toMatch(/No se pudo editar/);
  });
});

describe("recordDonorArrival", () => {
  it("anota una llegada directa", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await recordDonorArrival(admin, {
      userId: CUENTA,
      itemId: ITEM,
      quantity: "2",
      displayName: "María",
    });
    expect(result.status).toBe("ok");
    expect(fake.calls[0]).toMatchObject({
      name: "recordArrival",
      input: { userId: CUENTA, quantity: 2, displayName: "María" },
    });
    expect(fake.audit[0]).toMatchObject({ action: "pledge.recorded" });
  });

  it("editor no anota llegada", async () => {
    const { deps: editor } = deps("editor");
    expect(
      (await recordDonorArrival(editor, { userId: CUENTA, itemId: ITEM, quantity: "1" }))
        .status,
    ).toBe("rejected");
  });
});
