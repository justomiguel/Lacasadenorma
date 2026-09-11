import { describe, expect, it } from "vitest";

import { money } from "./money";
import { summarizeTransparency } from "./transparency";
import type { ExpenseRecord } from "./entities";

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

/**
 * `received` es lo que devuelve la vista `campaign_totals`: un total por moneda, ya
 * agregado y ya sin los aportes anulados. La exclusión de anulados del lado de los
 * aportes se prueba en SQL con pgTAP, que es donde vive esa regla desde el ADR-016;
 * acá se prueba lo que este módulo sí decide.
 */
describe("summarizeTransparency", () => {
  it("calcula recibido, gastado y saldo en la moneda principal", () => {
    const summary = summarizeTransparency({
      received: [money(150_000, "ARS")],
      expenses: [expense()],
      goal: money(1_000_000, "ARS"),
      reconciledAt: "2026-09-08T12:00:00.000Z",
    });

    expect(summary.primary.received).toEqual(money(150_000, "ARS"));
    expect(summary.primary.spent).toEqual(money(40_000, "ARS"));
    expect(summary.primary.balance).toEqual(money(110_000, "ARS"));
  });

  it("excluye los gastos anulados de todos los totales", () => {
    const summary = summarizeTransparency({
      received: [money(100_000, "ARS")],
      expenses: [expense(), expense({ voidedAt: "2026-09-05T00:00:00.000Z" })],
      goal: money(1_000_000, "ARS"),
      reconciledAt: null,
    });

    expect(summary.primary.spent).toEqual(money(40_000, "ARS"));
    expect(summary.expenseCount).toBe(1);
    // Y el anulado tampoco aparece en el detalle publicado: si apareciera, la
    // persona que lo lee lo contaría aunque la suma no lo cuente.
    expect(summary.expenses).toHaveLength(1);
  });

  it("la suma del detalle publicado coincide exactamente con el total (SC-007)", () => {
    const expenses = [
      expense({ amount: money(1, "ARS") }),
      expense({ amount: money(33_333, "ARS") }),
      expense({ amount: money(66_666, "ARS") }),
    ];

    const summary = summarizeTransparency({
      received: [],
      expenses,
      goal: null,
      reconciledAt: null,
    });

    const detailSum = summary.expenses.reduce(
      (acc, item) => acc + item.amount.amountMinor,
      0,
    );

    expect(detailSum).toBe(summary.primary.spent.amountMinor);
  });

  it("no mezcla monedas: separa lo que no está en la moneda principal", () => {
    const summary = summarizeTransparency({
      received: [money(100_000, "ARS"), money(20_000, "USD")],
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

  it("una moneda en la que sólo se gastó aparece con recibido en cero, no se omite", () => {
    // La vista devuelve una fila por moneda presente en aportes **o** en gastos, y
    // un saldo negativo en una moneda es un dato que hay que poder ver.
    const summary = summarizeTransparency({
      received: [money(100_000, "ARS"), money(0, "USD")],
      expenses: [expense({ amount: money(5_000, "USD") })],
      goal: money(1_000_000, "ARS"),
      reconciledAt: null,
    });

    expect(summary.others).toEqual([
      {
        currency: "USD",
        received: money(0, "USD"),
        spent: money(5_000, "USD"),
        balance: money(-5_000, "USD"),
        executedPercent: null,
      },
    ]);
  });

  it("devuelve porcentaje ejecutado nulo cuando el objetivo no está cargado", () => {
    const summary = summarizeTransparency({
      received: [money(100_000, "ARS")],
      expenses: [expense()],
      goal: null,
      reconciledAt: null,
    });

    expect(summary.primary.executedPercent).toBeNull();
  });

  it("calcula el porcentaje ejecutado sobre el objetivo cuando existe", () => {
    const summary = summarizeTransparency({
      received: [],
      expenses: [expense({ amount: money(250_000, "ARS") })],
      goal: money(1_000_000, "ARS"),
      reconciledAt: null,
    });

    expect(summary.primary.executedPercent).toBe(25);
  });

  it("agrupa el gasto por categoría y cuenta los comprobantes", () => {
    const summary = summarizeTransparency({
      received: [],
      expenses: [
        expense({
          category: "materiales",
          amount: money(10_000, "ARS"),
          receiptCount: 1,
        }),
        expense({ category: "materiales", amount: money(5_000, "ARS"), receiptCount: 2 }),
        expense({
          category: "mano_de_obra",
          amount: money(7_000, "ARS"),
          receiptCount: 0,
        }),
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
      received: [],
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
      received: [],
      expenses: [],
      goal: null,
      reconciledAt: null,
    });

    expect(summary.isEmpty).toBe(true);
    expect(summary.primary.received.amountMinor).toBe(0);
  });

  it("no está vacío si entró plata aunque todavía no se haya gastado nada", () => {
    const summary = summarizeTransparency({
      received: [money(100_000, "ARS")],
      expenses: [],
      goal: null,
      reconciledAt: null,
    });

    expect(summary.isEmpty).toBe(false);
  });

  it("marca el dato como desactualizado cuando la conciliación pasó los treinta días", () => {
    const summary = summarizeTransparency({
      received: [],
      expenses: [],
      goal: null,
      reconciledAt: "2026-07-01T00:00:00.000Z",
      now: new Date("2026-09-09T00:00:00.000Z"),
    });

    expect(summary.reconciliationIsStale).toBe(true);
  });

  it("no marca como desactualizada una conciliación reciente", () => {
    const summary = summarizeTransparency({
      received: [],
      expenses: [],
      goal: null,
      reconciledAt: "2026-09-05T00:00:00.000Z",
      now: new Date("2026-09-09T00:00:00.000Z"),
    });

    expect(summary.reconciliationIsStale).toBe(false);
  });

  it("no marca como desactualizado lo que nunca se concilió: no hay dato que envejecer", () => {
    const summary = summarizeTransparency({
      received: [],
      expenses: [],
      goal: null,
      reconciledAt: null,
      now: new Date("2026-09-09T00:00:00.000Z"),
    });

    expect(summary.reconciliationIsStale).toBe(false);
  });
});
