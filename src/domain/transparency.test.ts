import { describe, expect, it } from "vitest";

import { money } from "./money";
import { summarizeTransparency } from "./transparency";
import type { ContributionRecord, ExpenseRecord } from "./entities";

function contribution(partial: Partial<ContributionRecord> = {}): ContributionRecord {
  return {
    id: crypto.randomUUID(),
    amount: money(100_000, "ARS"),
    receivedAt: "2026-09-01",
    voidedAt: null,
    ...partial,
  };
}

function expense(partial: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    id: crypto.randomUUID(),
    amount: money(40_000, "ARS"),
    spentAt: "2026-09-02",
    concept: "Chapas para el techo",
    category: "materiales",
    supplier: null,
    budgetItemId: null,
    receiptCount: 0,
    voidedAt: null,
    ...partial,
  };
}

describe("summarizeTransparency", () => {
  it("calcula recibido, gastado y saldo en la moneda principal", () => {
    const summary = summarizeTransparency({
      contributions: [contribution(), contribution({ amount: money(50_000, "ARS") })],
      expenses: [expense()],
      goal: money(1_000_000, "ARS"),
      reconciledAt: "2026-09-08T12:00:00.000Z",
    });

    expect(summary.primary.received).toEqual(money(150_000, "ARS"));
    expect(summary.primary.spent).toEqual(money(40_000, "ARS"));
    expect(summary.primary.balance).toEqual(money(110_000, "ARS"));
  });

  it("excluye los registros anulados de todos los totales", () => {
    const summary = summarizeTransparency({
      contributions: [contribution(), contribution({ voidedAt: "2026-09-05T00:00:00.000Z" })],
      expenses: [expense(), expense({ voidedAt: "2026-09-05T00:00:00.000Z" })],
      goal: money(1_000_000, "ARS"),
      reconciledAt: null,
    });

    expect(summary.primary.received).toEqual(money(100_000, "ARS"));
    expect(summary.primary.spent).toEqual(money(40_000, "ARS"));
    expect(summary.expenseCount).toBe(1);
  });

  it("la suma del detalle publicado coincide exactamente con el total (SC-007)", () => {
    const expenses = [
      expense({ amount: money(1, "ARS") }),
      expense({ amount: money(33_333, "ARS") }),
      expense({ amount: money(66_666, "ARS") }),
    ];

    const summary = summarizeTransparency({
      contributions: [],
      expenses,
      goal: null,
      reconciledAt: null,
    });

    const detailSum = summary.expenses.reduce((acc, item) => acc + item.amount.amountMinor, 0);

    expect(detailSum).toBe(summary.primary.spent.amountMinor);
  });

  it("no mezcla monedas: separa lo que no está en la moneda principal", () => {
    const summary = summarizeTransparency({
      contributions: [contribution(), contribution({ amount: money(20_000, "USD") })],
      expenses: [expense()],
      goal: money(1_000_000, "ARS"),
      reconciledAt: null,
    });

    expect(summary.primary.currency).toBe("ARS");
    expect(summary.primary.received).toEqual(money(100_000, "ARS"));
    expect(summary.others).toEqual([
      {
        currency: "USD",
        received: money(20_000, "USD"),
        spent: money(0, "USD"),
        balance: money(20_000, "USD"),
        executedPercent: null,
      },
    ]);
  });

  it("devuelve porcentaje ejecutado nulo cuando el objetivo no está cargado", () => {
    const summary = summarizeTransparency({
      contributions: [contribution()],
      expenses: [expense()],
      goal: null,
      reconciledAt: null,
    });

    expect(summary.primary.executedPercent).toBeNull();
  });

  it("calcula el porcentaje ejecutado sobre el objetivo cuando existe", () => {
    const summary = summarizeTransparency({
      contributions: [],
      expenses: [expense({ amount: money(250_000, "ARS") })],
      goal: money(1_000_000, "ARS"),
      reconciledAt: null,
    });

    expect(summary.primary.executedPercent).toBe(25);
  });

  it("agrupa el gasto por categoría y cuenta los comprobantes", () => {
    const summary = summarizeTransparency({
      contributions: [],
      expenses: [
        expense({ category: "materiales", amount: money(10_000, "ARS"), receiptCount: 1 }),
        expense({ category: "materiales", amount: money(5_000, "ARS"), receiptCount: 2 }),
        expense({ category: "mano_de_obra", amount: money(7_000, "ARS"), receiptCount: 0 }),
      ],
      goal: null,
      reconciledAt: null,
    });

    expect(summary.byCategory).toEqual([
      { category: "materiales", amount: money(15_000, "ARS") },
      { category: "mano_de_obra", amount: money(7_000, "ARS") },
    ]);
    expect(summary.receiptCount).toBe(3);
  });

  it("ordena los gastos publicados del más reciente al más antiguo", () => {
    const summary = summarizeTransparency({
      contributions: [],
      expenses: [
        expense({ spentAt: "2026-08-01", concept: "viejo" }),
        expense({ spentAt: "2026-09-10", concept: "nuevo" }),
      ],
      goal: null,
      reconciledAt: null,
    });

    expect(summary.expenses.map((item) => item.concept)).toEqual(["nuevo", "viejo"]);
  });

  it("sin registros devuelve totales en cero y marca que está vacío", () => {
    const summary = summarizeTransparency({
      contributions: [],
      expenses: [],
      goal: null,
      reconciledAt: null,
    });

    expect(summary.isEmpty).toBe(true);
    expect(summary.primary.received.amountMinor).toBe(0);
  });

  it("marca el dato como desactualizado cuando la conciliación pasó los treinta días", () => {
    const summary = summarizeTransparency({
      contributions: [],
      expenses: [],
      goal: null,
      reconciledAt: "2026-07-01T00:00:00.000Z",
      now: new Date("2026-09-09T00:00:00.000Z"),
    });

    expect(summary.reconciliationIsStale).toBe(true);
  });

  it("no marca como desactualizada una conciliación reciente", () => {
    const summary = summarizeTransparency({
      contributions: [],
      expenses: [],
      goal: null,
      reconciledAt: "2026-09-05T00:00:00.000Z",
      now: new Date("2026-09-09T00:00:00.000Z"),
    });

    expect(summary.reconciliationIsStale).toBe(false);
  });

  it("no marca como desactualizado lo que nunca se concilió: no hay dato que envejecer", () => {
    const summary = summarizeTransparency({
      contributions: [],
      expenses: [],
      goal: null,
      reconciledAt: null,
      now: new Date("2026-09-09T00:00:00.000Z"),
    });

    expect(summary.reconciliationIsStale).toBe(false);
  });
});
