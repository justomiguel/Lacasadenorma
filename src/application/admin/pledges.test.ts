import { describe, expect, it, vi } from "vitest";

import { REVERT_PLEDGE_DEFAULT_REASON } from "@/src/domain/entities/donation-pledge";

import {
  acceptPledge,
  cancelPledge,
  deleteOffer,
  deletePledge,
  fulfillPledge,
  revertPledge,
} from "./pledges";
import { RECORD, deps } from "./admin-test-helpers";

const PLEDGE = RECORD;

describe("acceptPledge", () => {
  it("confirma que van a donar y deja rastro", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await acceptPledge(admin, { id: PLEDGE }, null);

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "acceptPledge")).toMatchObject({
      input: { id: PLEDGE, displayName: null, note: null },
    });
    expect(fake.audit[0]).toMatchObject({
      action: "pledge.accepted",
      entityTable: "donation_pledges",
      entityId: PLEDGE,
    });
  });

  it("si aceptaron aparecer, manda el nombre y la nota", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await acceptPledge(
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
    expect(fake.calls.find((call) => call.name === "acceptPledge")).toMatchObject({
      input: {
        id: PLEDGE,
        displayName: "Ana Pérez",
        note: "La dejan el sábado.",
      },
    });
  });

  it("aceptar aparecer sin nombre se rechaza antes de llamar", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await acceptPledge(
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

  it("no manda el correo de llegada", async () => {
    const { deps: admin } = deps("admin");
    const send = vi.fn();
    const result = await acceptPledge(
      admin,
      { id: PLEDGE },
      {
        sender: { send },
        siteUrl: "https://ejemplo.test",
        staffAddress: "equipo@ejemplo.test",
        record: vi.fn(),
        contactOf: async () => "ana@ejemplo.test",
        localeOf: async () => "es",
        what: "Chapas",
        userId: PLEDGE,
      },
    );

    expect(result.status).toBe("ok");
    expect(send).not.toHaveBeenCalled();
  });

  it("rechaza a un editor y no toca el puerto", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await acceptPledge(editor, { id: PLEDGE }, null);

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
    expect(fake.audit).toEqual([]);
  });
});

describe("fulfillPledge", () => {
  it("confirma la llegada y deja rastro", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await fulfillPledge(admin, { id: PLEDGE }, null);

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "fulfillPledge")).toMatchObject({
      input: { id: PLEDGE },
    });
    expect(fake.audit).toHaveLength(1);
    expect(fake.audit[0]).toMatchObject({
      action: "pledge.fulfilled",
      entityTable: "donation_pledges",
      entityId: PLEDGE,
    });
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

describe("revertPledge", () => {
  it("revierte un Donado y deja rastro", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await revertPledge(admin, { id: PLEDGE, title: "Chapas" }, null);

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "revertPledge")).toMatchObject({
      input: { id: PLEDGE, reason: REVERT_PLEDGE_DEFAULT_REASON },
    });
    expect(fake.audit[0]).toMatchObject({
      action: "pledge.reverted",
      entityTable: "donation_pledges",
      entityId: PLEDGE,
      diff: { title: "Chapas" },
    });
  });

  it("si escriben motivo, lo manda", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await revertPledge(
      admin,
      { id: PLEDGE, title: "Chapas", reason: "No era de esta campaña." },
      null,
    );

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "revertPledge")).toMatchObject({
      input: { id: PLEDGE, reason: "No era de esta campaña." },
    });
  });

  it("rechaza a un editor y no toca el puerto", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await revertPledge(editor, { id: PLEDGE, title: "Chapas" }, null);

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
    expect(fake.audit).toEqual([]);
  });
});

describe("deletePledge", () => {
  it("borra la reserva y deja rastro", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await deletePledge(admin, { id: PLEDGE, title: "Chapas" });

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "deletePledge")).toMatchObject({
      input: PLEDGE,
    });
    expect(fake.audit[0]).toMatchObject({
      action: "pledge.deleted",
      entityTable: "donation_pledges",
      entityId: PLEDGE,
      diff: { title: "Chapas" },
    });
  });

  it("borra un aviso por teléfono", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await deleteOffer(admin, { id: PLEDGE, title: "Cal" });

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "deleteOffer")).toMatchObject({
      input: PLEDGE,
    });
  });

  it("rechaza a un editor", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await deletePledge(editor, { id: PLEDGE, title: "Chapas" });

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
  });
});
