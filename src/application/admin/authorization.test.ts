import { describe, expect, it } from "vitest";

import { fakeAdminGateway } from "../test-support/fake-admin-gateway";
import { recordExpense } from "./expenses";
import { savePaymentMethod } from "./payment-methods";
import { saveUpdate } from "./updates";
import { CAMPAIGN, deps, noSession, validExpense } from "./admin-test-helpers";

// ── Autorización ────────────────────────────────────────────────────────────
// Es lo primero porque es lo que más importa: una operación sin sesión o con un rol
// insuficiente no llega al puerto. Y "no llega" se afirma mirando `calls`, no sólo
// el resultado: un rechazo que igual escribió es un rechazo que no sirvió.

describe("autorización", () => {
  it("rechaza una operación sin sesión y no toca el puerto (amenaza T7)", async () => {
    const gateway = fakeAdminGateway();
    const result = await recordExpense(noSession(gateway), validExpense);

    expect(result.status).toBe("rejected");
    expect(gateway.calls).toEqual([]);
  });

  it("rechaza a un editor que intenta registrar un gasto", async () => {
    const { deps: editor, fake } = deps("editor");
    const result = await recordExpense(editor, validExpense);

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
  });

  it("rechaza a un auditor en toda escritura, incluida la de contenido", async () => {
    const { deps: auditor, fake } = deps("auditor");

    const expense = await recordExpense(auditor, validExpense);
    const update = await saveUpdate(auditor, {
      campaignId: CAMPAIGN,
      slug: "techo-nuevo",
      title: "El techo",
      body: "Se colocaron las chapas.",
    });

    expect(expense.status).toBe("rejected");
    expect(update.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
  });

  it("rechaza a un admin que intenta tocar una cuenta bancaria (amenaza T1)", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await savePaymentMethod(admin, {
      campaignId: CAMPAIGN,
      countryCode: "AR",
      currency: "ARS",
      label: "Transferencia en Argentina",
      fields: [{ label: "CBU", value: "0170099220000067797", copyable: "on" }],
    });

    expect(result.status).toBe("rejected");
    expect(fake.calls).toEqual([]);
  });

  it("deja pasar a owner en la cuenta bancaria", async () => {
    const { deps: owner } = deps("owner");
    const result = await savePaymentMethod(owner, {
      campaignId: CAMPAIGN,
      countryCode: "AR",
      currency: "ARS",
      label: "Transferencia en Argentina",
      fields: [{ label: "CBU", value: "0170099220000067797", copyable: "on" }],
    });

    expect(result.status).toBe("ok");
  });

  it("deja pasar a un editor en contenido", async () => {
    const { deps: editor } = deps("editor");
    const result = await saveUpdate(editor, {
      campaignId: CAMPAIGN,
      slug: "techo-nuevo",
      title: "Empezó el techo",
      body: "Llegaron las chapas y se colocaron las cabriadas.",
    });

    expect(result.status).toBe("ok");
  });
});
