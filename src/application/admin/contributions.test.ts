import { describe, expect, it } from "vitest";

import { markReconciled, recordContribution, voidContribution } from "./contributions";
import { CAMPAIGN, RECORD, deps } from "./admin-test-helpers";

// ── Aportes ─────────────────────────────────────────────────────────────────

describe("aportes", () => {
  it("registra el aporte con su monto convertido", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await recordContribution(admin, {
      campaignId: CAMPAIGN,
      amount: "500.000",
      currency: "ARS",
      receivedAt: "2026-08-01",
    });

    expect(result.status).toBe("ok");
    expect(fake.calls[0]).toMatchObject({
      input: { amount: { amountMinor: 50_000_000, currency: "ARS" } },
    });
  });

  /**
   * La nota de conciliación es lo más cercano a un dato personal que hay en el
   * sistema, y el registro de auditoría lo leen más roles que la tabla de aportes.
   * Se guarda si existe, nunca qué dice (FR-014).
   */
  it("no copia la nota de conciliación al registro de auditoría", async () => {
    const { deps: admin, fake } = deps("admin");
    await recordContribution(admin, {
      campaignId: CAMPAIGN,
      amount: "500.000",
      currency: "ARS",
      receivedAt: "2026-08-01",
      sourceNote: "Transferencia de Marta desde Resistencia",
    });

    expect(JSON.stringify(fake.audit)).not.toContain("Marta");
    expect(fake.audit[0]).toMatchObject({ diff: { hasSourceNote: true } });
  });

  it("marca la conciliación con la fecha dada", async () => {
    const { deps: admin, fake } = deps("admin");
    const result = await markReconciled(admin, {
      campaignId: CAMPAIGN,
      reconciledAt: "2026-09-01",
    });

    expect(result.status).toBe("ok");
    expect(fake.audit[0]).toMatchObject({
      action: "campaign.reconciled",
      diff: { reconciledAt: "2026-09-01" },
    });
  });

  it("anula un aporte con motivo", async () => {
    const { deps: admin } = deps("admin");
    const result = await voidContribution(admin, {
      id: RECORD,
      reason: "El banco rechazó la transferencia y volvió atrás.",
    });

    expect(result.status).toBe("ok");
  });
});
