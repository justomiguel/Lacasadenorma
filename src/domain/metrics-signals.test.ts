import { describe, expect, it } from "vitest";

import { money } from "./money";
import { EMPTY_METRICS_FACTS, type MetricsFacts } from "./metrics";
import { collectSignals } from "./metrics-signals";

const NOW = new Date("2026-09-16T12:00:00.000Z");

function facts(partial: Partial<MetricsFacts> = {}): MetricsFacts {
  return { ...EMPTY_METRICS_FACTS, ...partial };
}

describe("collectSignals", () => {
  it("sin observaciones no inventa avisos", () => {
    expect(
      collectSignals(
        { goal: money(100_000_000, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
        facts({ paymentMethods: [{ publishedAt: "2026-09-01T00:00:00.000Z" }] }),
        NOW,
      ),
    ).toEqual([]);
  });

  it("una conciliación de más de treinta días es danger hacia aportes", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-08-01T00:00:00.000Z" },
      facts(),
      NOW,
    );

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "reconciliation_stale",
          severity: "danger",
          href: "/admin/aportes",
        }),
      ]),
    );
  });

  it("nunca conciliado es warning, no un dato viejo (FR-010)", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: null },
      facts(),
      NOW,
    );

    expect(
      signals.find((signal) => signal.id === "reconciliation_stale"),
    ).toBeUndefined();
    expect(signals.find((signal) => signal.id === "never_reconciled")).toEqual(
      expect.objectContaining({ severity: "warning", href: "/admin/aportes" }),
    );
  });

  it("sin objetivo interno avisa, no finge un 0 %", () => {
    const signals = collectSignals(
      { goal: null, reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts(),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "no_goal")).toEqual(
      expect.objectContaining({ severity: "warning", href: "/admin/objetivos" }),
    );
  });

  it("cuentas pending avisan hacia donantes", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        donors: [
          { approvalStatus: "pending" },
          { approvalStatus: "pending" },
          { approvalStatus: "approved" },
        ],
      }),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "pending_donors")).toEqual(
      expect.objectContaining({ count: 2, href: "/admin/donantes", severity: "warning" }),
    );
  });

  it("reservas que vencen en tres días o menos son danger", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        pledges: [
          {
            status: "reserved",
            quantity: 2,
            coverChannel: "bring",
            expiresAt: "2026-09-18T00:00:00.000Z",
            remindedAt: null,
          },
        ],
      }),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "pledges_expiring")).toEqual(
      expect.objectContaining({
        count: 1,
        severity: "danger",
        href: "/admin/donaciones",
      }),
    );
  });

  it("una reserva cuyo plazo ya pasó y sigue reserved cuenta como por vencer", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        pledges: [
          {
            status: "reserved",
            quantity: 1,
            coverChannel: "bring",
            expiresAt: "2026-09-10T00:00:00.000Z",
            remindedAt: "2026-09-08T00:00:00.000Z",
          },
        ],
      }),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "pledges_expiring")?.count).toBe(1);
  });

  it("una expired vieja no avisa que el material volvió solo", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        pledges: [
          {
            status: "expired",
            quantity: 1,
            coverChannel: "bring",
            expiresAt: "2026-09-01T00:00:00.000Z",
            remindedAt: null,
          },
        ],
      }),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "pledges_expired")).toBeUndefined();
  });

  it("gastos vivos sin comprobante avisan", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        expenses: [
          {
            amountMinor: 100,
            currency: "ARS",
            spentAt: "2026-09-02",
            category: "materiales",
            receiptCount: 0,
            voidedAt: null,
            publishedAt: "2026-09-02T00:00:00.000Z",
          },
          {
            amountMinor: 50,
            currency: "ARS",
            spentAt: "2026-09-03",
            category: "servicios",
            receiptCount: 1,
            voidedAt: null,
            publishedAt: "2026-09-03T00:00:00.000Z",
          },
        ],
      }),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "expenses_without_receipts")).toEqual(
      expect.objectContaining({ count: 1, href: "/admin/gastos", severity: "warning" }),
    );
  });

  it("correos failed son danger", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({ emails: [{ status: "failed" }, { status: "sent" }] }),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "failed_emails")).toEqual(
      expect.objectContaining({ count: 1, severity: "danger" }),
    );
  });

  it("sin cuentas bancarias publicadas es danger", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({ paymentMethods: [{ publishedAt: null }] }),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "no_published_accounts")).toEqual(
      expect.objectContaining({ severity: "danger", href: "/admin/cuentas" }),
    );
  });

  it("la plata anulada de más del 10 % avisa", () => {
    const signals = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        contributions: [
          {
            amountMinor: 100_000,
            currency: "ARS",
            receivedAt: "2026-09-01",
            voidedAt: null,
          },
          {
            amountMinor: 20_000,
            currency: "ARS",
            receivedAt: "2026-09-02",
            voidedAt: "2026-09-03T00:00:00.000Z",
          },
        ],
      }),
      NOW,
    );

    expect(signals.find((signal) => signal.id === "voided_share")).toEqual(
      expect.objectContaining({ severity: "warning", href: "/admin/aportes" }),
    );
  });

  it("una novedad publicada hace más de catorce días avisa; nunca publicada no", () => {
    const stale = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        paymentMethods: [{ publishedAt: "2026-09-01T00:00:00.000Z" }],
        updates: [{ publishedAt: "2026-08-31T12:00:00.000Z" }],
      }),
      NOW,
    );
    const never = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        paymentMethods: [{ publishedAt: "2026-09-01T00:00:00.000Z" }],
        updates: [{ publishedAt: null }],
      }),
      NOW,
    );
    const recent = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        paymentMethods: [{ publishedAt: "2026-09-01T00:00:00.000Z" }],
        updates: [{ publishedAt: "2026-09-10T12:00:00.000Z" }],
      }),
      NOW,
    );

    expect(stale.find((signal) => signal.id === "news_stale")).toEqual(
      expect.objectContaining({
        severity: "warning",
        href: "/admin/novedades",
        count: 16,
      }),
    );
    expect(never.find((signal) => signal.id === "news_stale")).toBeUndefined();
    expect(recent.find((signal) => signal.id === "news_stale")).toBeUndefined();
  });

  it("un aporte vivo viejo avisa; sólo anulados o recientes no", () => {
    const stale = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        paymentMethods: [{ publishedAt: "2026-09-01T00:00:00.000Z" }],
        contributions: [
          {
            amountMinor: 100,
            currency: "ARS",
            receivedAt: "2026-08-30T12:00:00.000Z",
            voidedAt: null,
          },
        ],
      }),
      NOW,
    );
    const voidedOnly = collectSignals(
      { goal: money(1, "ARS"), reconciledAt: "2026-09-01T00:00:00.000Z" },
      facts({
        paymentMethods: [{ publishedAt: "2026-09-01T00:00:00.000Z" }],
        contributions: [
          {
            amountMinor: 100,
            currency: "ARS",
            receivedAt: "2026-08-01T12:00:00.000Z",
            voidedAt: "2026-08-02T12:00:00.000Z",
          },
        ],
      }),
      NOW,
    );

    expect(stale.find((signal) => signal.id === "contributions_stale")).toEqual(
      expect.objectContaining({
        severity: "warning",
        href: "/admin/aportes",
        count: 17,
      }),
    );
    expect(
      voidedOnly.find((signal) => signal.id === "contributions_stale"),
    ).toBeUndefined();
  });
});
