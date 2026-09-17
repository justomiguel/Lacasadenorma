import { describe, expect, it } from "vitest";

import { cancelPledge, fulfillPledge } from "./pledges";
import { RECORD, deps } from "./admin-test-helpers";

const PLEDGE = RECORD;

describe("fulfillPledge", () => {
  it("confirma la llegada y deja rastro", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await fulfillPledge(admin, { id: PLEDGE }, null);

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "fulfillPledge")).toMatchObject({
      input: { id: PLEDGE, displayName: null, note: null },
    });
    expect(fake.audit).toHaveLength(1);
    expect(fake.audit[0]).toMatchObject({
      action: "pledge.fulfilled",
      entityTable: "donation_pledges",
      entityId: PLEDGE,
    });
  });

  it("si aceptaron aparecer, manda el nombre y la nota", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await fulfillPledge(
      admin,
      {
        id: PLEDGE,
        aparecer: "on",
        nombre: "Ana Pérez",
        nota: "La dejan el sábado.",
      },
      null,
    );

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "fulfillPledge")).toMatchObject({
      input: {
        id: PLEDGE,
        displayName: "Ana Pérez",
        note: "La dejan el sábado.",
      },
    });
  });

  it("aceptar aparecer sin nombre se rechaza antes de llamar", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await fulfillPledge(
      admin,
      { id: PLEDGE, aparecer: "on", nombre: "  " },
      null,
    );

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.fieldErrors["nombre"]).toMatch(/nombre/i);
    }
    expect(fake.calls).toEqual([]);
  });

  it("rechaza a un editor y no toca el puerto", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await fulfillPledge(editor, { id: PLEDGE }, null);

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
    expect(fake.audit).toEqual([]);
  });
});

describe("cancelPledge", () => {
  it("cancela con motivo y deja rastro sin el texto", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await cancelPledge(
      admin,
      { id: PLEDGE, reason: "No va a poder traerlo." },
      null,
    );

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "cancelPledge")).toMatchObject({
      input: { id: PLEDGE, reason: "No va a poder traerlo." },
    });
    expect(fake.audit[0]).toMatchObject({
      action: "pledge.cancelled",
      entityTable: "donation_pledges",
      diff: { reason: true },
    });
  });

  it("exige el motivo", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await cancelPledge(admin, { id: PLEDGE, reason: "  " }, null);

    expect(result.status).toBe("invalid");
    expect(fake.calls).toEqual([]);
  });

  it("rechaza a un editor", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await cancelPledge(
      editor,
      { id: PLEDGE, reason: "No corresponde." },
      null,
    );

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
  });
});
