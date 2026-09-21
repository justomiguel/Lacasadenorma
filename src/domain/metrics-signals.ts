import { PLEDGE_REMINDER_DAYS } from "./entities/donation-pledge";
import { isReconciliationStale } from "./transparency";
import { remaining } from "./catalog";
import type { CurrencyCode } from "./money";
import type { MetricSignal, MetricsCampaign, MetricsFacts } from "./metrics";

const VOIDED_SHARE_PERCENT = 10;
const PULSE_STALE_DAYS = 14;

function push(
  signals: MetricSignal[],
  signal: Omit<MetricSignal, "count"> & { count?: number },
): void {
  const count = signal.count ?? 1;

  if (count <= 0) {
    return;
  }

  signals.push({ ...signal, count });
}

function liveMinor(
  items: readonly {
    amountMinor: number;
    currency: CurrencyCode;
    voidedAt: string | null;
  }[],
  currency: CurrencyCode,
  voided: boolean,
): number {
  return items
    .filter(
      (item) =>
        item.currency === currency &&
        (voided ? item.voidedAt !== null : item.voidedAt === null),
    )
    .reduce((total, item) => total + item.amountMinor, 0);
}

function expiresWithinReminder(expiresAt: string, now: Date): boolean {
  const expires = new Date(expiresAt).getTime();

  if (Number.isNaN(expires)) {
    return false;
  }

  const horizon = now.getTime() + PLEDGE_REMINDER_DAYS * 86_400_000;

  return expires <= horizon;
}

function latestIso(values: readonly (string | null)[]): string | null {
  let latest: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    if (value === null) continue;

    const time = new Date(value).getTime();

    if (Number.isNaN(time) || time <= latestTime) continue;

    latestTime = time;
    latest = value;
  }

  return latest;
}

function pushStale(
  signals: MetricSignal[],
  input: {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly href: string;
    readonly latest: string | null;
    readonly now: Date;
  },
): void {
  if (input.latest === null) {
    return;
  }

  const time = new Date(input.latest).getTime();

  if (Number.isNaN(time) || time > input.now.getTime()) {
    return;
  }

  const days = Math.floor((input.now.getTime() - time) / 86_400_000);

  if (days <= PULSE_STALE_DAYS) {
    return;
  }

  push(signals, {
    id: input.id,
    severity: "warning",
    title: input.title,
    body: input.body,
    href: input.href,
    count: days,
  });
}

/**
 * Excepciones que piden una decisión. Un umbral que ya existe se reutiliza;
 * un aviso sin observaciones no se inventa (FR-606, FR-607).
 */
export function collectSignals(
  campaign: MetricsCampaign | null,
  facts: MetricsFacts,
  now: Date,
): readonly MetricSignal[] {
  const signals: MetricSignal[] = [];
  const currency = campaign?.goal?.currency ?? "ARS";

  if (campaign?.goal === null || campaign === null) {
    push(signals, {
      id: "no_goal",
      severity: "warning",
      title: "Sin objetivo interno",
      body: "El tablero no puede marcar el 100 % de recaudación hasta que lo cargues. El sitio público no lo publica.",
      href: "/admin/objetivos",
    });
  }

  if (campaign !== null && campaign.reconciledAt === null) {
    push(signals, {
      id: "never_reconciled",
      severity: "warning",
      title: "Nunca se concilió",
      body: "Todavía no hay una fecha de conciliación. Es distinto de un dato viejo: no hay nada que envejezca.",
      href: "/admin/aportes",
    });
  } else if (campaign !== null && isReconciliationStale(campaign.reconciledAt, now)) {
    push(signals, {
      id: "reconciliation_stale",
      severity: "danger",
      title: "Conciliación atrasada",
      body: "Pasaron más de treinta días desde la última conciliación. El sitio público ya lo está avisando.",
      href: "/admin/aportes",
    });
  }

  const pendingDonors = facts.donors.filter(
    (donor) => donor.approvalStatus === "pending",
  ).length;
  push(signals, {
    id: "pending_donors",
    severity: "warning",
    title: "Cuentas para revisar",
    body: "Hay pedidos de cuenta del público esperando una decisión.",
    href: "/admin/donantes",
    count: pendingDonors,
  });

  const expiring = facts.pledges.filter(
    (pledge) =>
      pledge.status === "reserved" && expiresWithinReminder(pledge.expiresAt, now),
  ).length;
  push(signals, {
    id: "pledges_expiring",
    severity: "danger",
    title: "Reservas por vencer",
    body: "Hay reservas cuyo plazo vence en tres días o menos, o que ya se pasó y siguen en curso.",
    href: "/admin/donaciones",
    count: expiring,
  });

  const withoutReceipt = facts.expenses.filter(
    (item) => item.voidedAt === null && item.receiptCount === 0,
  ).length;
  push(signals, {
    id: "expenses_without_receipts",
    severity: "warning",
    title: "Gastos sin comprobante",
    body: "Hay gastos vivos sin archivo de respaldo.",
    href: "/admin/gastos",
    count: withoutReceipt,
  });

  const unpublished = facts.expenses.filter(
    (item) => item.voidedAt === null && item.publishedAt === null,
  ).length;
  push(signals, {
    id: "unpublished_expenses",
    severity: "info",
    title: "Gastos sin publicar",
    body: "Están en el libro interno y el sitio todavía no los muestra.",
    href: "/admin/gastos",
    count: unpublished,
  });

  const failedEmails = facts.emails.filter((email) => email.status === "failed").length;
  push(signals, {
    id: "failed_emails",
    severity: "danger",
    title: "Correos que no salieron",
    body: "El producto anotó envíos fallidos. No hay una pantalla de correos: el rastro está en la base.",
    href: "/admin",
    count: failedEmails,
  });

  const publishedAccounts = facts.paymentMethods.filter(
    (method) => method.publishedAt !== null,
  ).length;
  if (publishedAccounts === 0) {
    push(signals, {
      id: "no_published_accounts",
      severity: "danger",
      title: "Nadie puede transferir",
      body: "No hay una cuenta bancaria publicada. Quien quiere aportar con plata no tiene datos.",
      href: "/admin/cuentas",
    });
  }

  const live = liveMinor(facts.contributions, currency, false);
  const voided = liveMinor(facts.contributions, currency, true);
  const whole = live + voided;
  if (whole > 0 && voided * 100 > whole * VOIDED_SHARE_PERCENT) {
    push(signals, {
      id: "voided_share",
      severity: "warning",
      title: "Mucha plata anulada",
      body: "Más del diez por ciento de lo registrado en la moneda principal está anulado.",
      href: "/admin/aportes",
    });
  }

  const leftover = facts.catalog.reduce(
    (total, item) =>
      total +
      remaining({
        needed: item.needed,
        reserved: item.reserved,
        fulfilled: item.fulfilled,
      }),
    0,
  );
  push(signals, {
    id: "catalog_remaining",
    severity: "info",
    title: "Sigue faltando material",
    body: "Hay unidades del catálogo sin cubrir.",
    href: "/admin/catalogo",
    count: leftover,
  });

  const drafts = facts.updates.filter((item) => item.publishedAt === null).length;
  push(signals, {
    id: "news_drafts",
    severity: "info",
    title: "Borradores de novedad",
    body: "Hay avances escritos que todavía no se publicaron.",
    href: "/admin/novedades",
    count: drafts,
  });

  const openMilestones = facts.milestones.filter(
    (item) => item.status !== "completado",
  ).length;
  push(signals, {
    id: "milestones_open",
    severity: "info",
    title: "Hitos abiertos",
    body: "Hay pasos de la obra pendientes o en curso.",
    href: "/admin/hitos",
    count: openMilestones,
  });

  pushStale(signals, {
    id: "news_stale",
    title: "Sin novedad publicada",
    body: "Hace más de catorce días que no se publica un avance. El silencio se lee como que algo salió mal.",
    href: "/admin/novedades",
    latest: latestIso(facts.updates.map((item) => item.publishedAt)),
    now,
  });
  pushStale(signals, {
    id: "contributions_stale",
    title: "Sin aportes nuevos",
    body: "Hace más de catorce días que no entra un aporte vivo en el libro.",
    href: "/admin/aportes",
    latest: latestIso(
      facts.contributions
        .filter((item) => item.voidedAt === null)
        .map((item) => item.receivedAt),
    ),
    now,
  });

  const rank: Record<MetricSignal["severity"], number> = {
    danger: 0,
    warning: 1,
    info: 2,
  };

  return signals.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id),
  );
}
