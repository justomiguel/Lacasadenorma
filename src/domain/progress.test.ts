import { describe, expect, it } from "vitest";

import { money } from "./money";
import { summarizeFundraising, summarizeMilestones } from "./progress";
import type { MilestoneRecord } from "./entities";

function milestone(partial: Partial<MilestoneRecord> = {}): MilestoneRecord {
  return {
    id: crypto.randomUUID(),
    title: "Techo",
    description: null,
    status: "pendiente",
    happenedOn: null,
    sortOrder: 0,
    ...partial,
  };
}

describe("summarizeFundraising", () => {
  it("informa lo recaudado y el porcentaje contra el objetivo", () => {
    const result = summarizeFundraising({
      received: [money(250_000, "ARS")],
      goal: money(1_000_000, "ARS"),
    });

    expect(result.raised).toEqual(money(250_000, "ARS"));
    expect(result.percent).toBe(25);
  });

  it("sin objetivo cargado informa lo recaudado y omite el porcentaje", () => {
    const result = summarizeFundraising({
      received: [money(250_000, "ARS")],
      goal: null,
    });

    expect(result.raised).toEqual(money(250_000, "ARS"));
    expect(result.percent).toBeNull();
  });

  it("sin aportes ni objetivo no hay nada que mostrar", () => {
    const result = summarizeFundraising({ received: [], goal: null });

    expect(result.hasData).toBe(false);
  });

  it("cuando la moneda recibida no es la del objetivo, no la suma al total", () => {
    const result = summarizeFundraising({
      received: [money(250_000, "ARS"), money(20_000, "USD")],
      goal: money(1_000_000, "ARS"),
    });

    expect(result.raised).toEqual(money(250_000, "ARS"));
    expect(result.otherCurrencies).toEqual([money(20_000, "USD")]);
  });

  it("una moneda con total cero no se anuncia como recibida", () => {
    // La vista devuelve una fila por moneda presente en aportes **o** en gastos, así
    // que un cero acá significa "en esta moneda se gastó, no entró nada". Decir
    // "también se recibieron US$ 0" sería falso.
    const result = summarizeFundraising({
      received: [money(250_000, "ARS"), money(0, "USD")],
      goal: money(1_000_000, "ARS"),
    });

    expect(result.otherCurrencies).toEqual([]);
  });
});

describe("summarizeMilestones", () => {
  it("cuenta hitos completados sobre el total", () => {
    const result = summarizeMilestones([
      milestone({ status: "completado", happenedOn: "2026-08-01" }),
      milestone({ status: "en_curso" }),
      milestone({ status: "pendiente" }),
      milestone({ status: "pendiente" }),
    ]);

    expect(result.completedCount).toBe(1);
    expect(result.totalCount).toBe(4);
    expect(result.percentComplete).toBe(25);
  });

  it("sin hitos cargados devuelve porcentaje nulo, no cero", () => {
    const result = summarizeMilestones([]);

    expect(result.totalCount).toBe(0);
    expect(result.percentComplete).toBeNull();
  });

  it("ordena por el orden editorial, no por estado", () => {
    const result = summarizeMilestones([
      milestone({ title: "segundo", sortOrder: 2 }),
      milestone({ title: "primero", sortOrder: 1 }),
    ]);

    expect(result.milestones.map((item) => item.title)).toEqual(["primero", "segundo"]);
  });
});
