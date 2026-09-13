import { describe, expect, it } from "vitest";

import { attachExpenseReceipt, recordExpense, voidExpense } from "./expenses";
import { RECORD, deps, validExpense } from "./admin-test-helpers";

// ── Gastos ──────────────────────────────────────────────────────────────────

describe("gastos", () => {
  it("convierte el monto escrito a mano a la unidad mínima", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await recordExpense(admin, validExpense);

    expect(result.status).toBe("ok");
    expect(fake.calls[0]).toMatchObject({
      name: "recordExpense",
      input: { amount: { amountMinor: 124_000_000, currency: "ARS" } },
    });
  });

  it("deja el error del monto en el campo del monto (FR-023)", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await recordExpense(admin, { ...validExpense, amount: "mil pesos" });

    expect(result).toMatchObject({ status: "invalid" });
    expect(result.status === "invalid" ? result.fieldErrors : {}).toHaveProperty(
      "amount",
    );
    expect(fake.calls).toEqual([]);
  });

  it("rechaza una fecha futura", async () => {
    const { deps: admin } = deps("admin");
    const result = await recordExpense(admin, { ...validExpense, spentAt: "2099-01-01" });

    expect(result).toMatchObject({ status: "invalid" });
    expect(result.status === "invalid" ? result.fieldErrors : {}).toHaveProperty(
      "spentAt",
    );
  });

  it("rechaza un monto negativo: un gasto se anula, no se carga al revés", async () => {
    const { deps: admin } = deps("admin");
    const result = await recordExpense(admin, { ...validExpense, amount: "-5000" });

    expect(result.status).toBe("invalid");
  });

  it("registra el gasto en la auditoría con monto, fecha y concepto (FR-016)", async () => {
    const { deps: admin, fake } = deps("admin");
    await recordExpense(admin, validExpense);

    expect(fake.audit).toHaveLength(1);
    expect(fake.audit[0]).toMatchObject({
      action: "expense.created",
      entityTable: "expenses",
      diff: { spentAt: "2026-08-05", concept: "Chapas para el techo" },
    });
  });

  it("exige un motivo de al menos diez caracteres para anular (FR-015)", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await voidExpense(admin, { id: RECORD, reason: "error" });

    expect(result.status).toBe("invalid");
    expect(fake.calls).toEqual([]);
  });

  it("anula con motivo y lo deja en la auditoría", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await voidExpense(admin, {
      id: RECORD,
      reason: "Se cargó dos veces el mismo remito.",
    });

    expect(result.status).toBe("ok");
    expect(fake.audit[0]).toMatchObject({
      action: "expense.voided",
      diff: { reason: "Se cargó dos veces el mismo remito." },
    });
  });

  it("sube el comprobante y lo registra en la auditoría", async () => {
    const { deps: admin, fake } = deps("admin");
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "factura.jpg", {
      type: "image/jpeg",
    });

    const result = await attachExpenseReceipt(admin, { expenseId: RECORD, file });

    expect(result.status).toBe("ok");
    expect(fake.audit[0]).toMatchObject({ action: "expense.receipt_attached" });
  });

  it("pide un archivo cuando no viene ninguno", async () => {
    const { deps: admin } = deps("admin");
    const result = await attachExpenseReceipt(admin, {
      expenseId: RECORD,
      file: "factura.jpg",
    });

    expect(result.status).toBe("invalid");
  });
});
