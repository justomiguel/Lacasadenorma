import { describe, expect, it } from "vitest";

import { CatalogOversubscribedError } from "@/src/domain/errors";

import { fakeAdminGateway } from "../test-support/fake-admin-gateway";
import { deleteDonationItem, saveDonationItem } from "./catalog";
import { CAMPAIGN, RECORD, deps } from "./admin-test-helpers";

const chapas = {
  campaignId: CAMPAIGN,
  title: "Chapas del techo",
  unit: "unidad",
  neededQuantity: "40",
  category: "materiales",
  currency: "ARS",
};

describe("saveDonationItem", () => {
  it("guarda un ítem sin valor estimado sin inventarle un cero", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await saveDonationItem(editor, { ...chapas, amount: "" });

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "saveItem")).toMatchObject({
      input: { estimatedValue: null, neededQuantity: 40 },
    });
  });

  it("deja rastro con el título, la cantidad y si quedó publicado", async () => {
    const { deps: editor, fake } = deps("editor");
    await saveDonationItem(editor, { ...chapas, publish: "on" });

    expect(fake.audit).toHaveLength(1);
    expect(fake.audit[0]).toMatchObject({
      action: "donation_item.created",
      entityTable: "donation_items",
      diff: { title: "Chapas del techo", needed: 40, published: true },
    });
  });

  it("traduce el check de no-sobreventa a un mensaje con las unidades comprometidas", async () => {
    const gateway = fakeAdminGateway({
      failWith: new CatalogOversubscribedError(3),
    });
    const { deps: editor } = deps("editor", gateway);

    const result = await saveDonationItem(editor, {
      ...chapas,
      id: RECORD,
      neededQuantity: "2",
    });

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;

    expect(result.message).toBe("Hay 3 unidades comprometidas; cancelalas primero.");
    expect(result.fieldErrors.neededQuantity).toBe(
      "Hay 3 unidades comprometidas; cancelalas primero.",
    );
  });

  it("no deja subir una foto sin descripción", async () => {
    const { deps: editor, fake } = deps("editor");
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "chapas.jpg", {
      type: "image/jpeg",
    });

    const result = await saveDonationItem(editor, { ...chapas, file, alt: "techo" });

    expect(result.status).toBe("invalid");
    expect(fake.calls.filter((call) => call.name === "saveItem")).toEqual([]);
  });
});

describe("deleteDonationItem", () => {
  it("borra un ítem que nadie tomó y deja rastro con el título", async () => {
    const { deps: owner, fake } = deps("owner");
    const result = await deleteDonationItem(owner, {
      id: RECORD,
      title: "Chapas del techo",
    });

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "deleteItem")).toMatchObject({
      input: RECORD,
    });
    expect(fake.audit).toHaveLength(1);
    expect(fake.audit[0]).toMatchObject({
      action: "donation_item.deleted",
      entityTable: "donation_items",
      entityId: RECORD,
      diff: { title: "Chapas del techo" },
    });
  });

  it("no deja borrar al editor", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await deleteDonationItem(editor, {
      id: RECORD,
      title: "Chapas del techo",
    });

    expect(result.status).toBe("rejected");
    expect(fake.calls.filter((call) => call.name === "deleteItem")).toEqual([]);
    expect(fake.audit).toHaveLength(0);
  });

  it("borra también un ítem que alguien ya tomó", async () => {
    const { deps: owner, fake } = deps("owner");
    const result = await deleteDonationItem(owner, {
      id: RECORD,
      title: "Chapas del techo",
    });

    expect(result.status).toBe("ok");
    expect(fake.calls.find((call) => call.name === "deleteItem")).toMatchObject({
      input: RECORD,
    });
  });
});
