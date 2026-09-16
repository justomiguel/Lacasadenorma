import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "./entities/expense";
import { money, sumMoney, type CurrencyCode } from "./money";
import type { BarChart, ChartSignal, MetricsFacts, SeriesChart } from "./metrics";

const WEEK_COUNT = 12;

export function startOfIsoWeekUtc(date: Date): Date {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offset),
  );
}

export function weekKey(date: Date): string {
  return startOfIsoWeekUtc(date).toISOString().slice(0, 10);
}

function parseDay(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

function weekLabel(start: Date): string {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const format = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return `${format.format(start)} – ${format.format(end)}`;
}

function lastWeekStarts(now: Date): Date[] {
  const current = startOfIsoWeekUtc(now);

  return Array.from({ length: WEEK_COUNT }, (_, index) => {
    const start = new Date(current);
    start.setUTCDate(start.getUTCDate() - (WEEK_COUNT - 1 - index) * 7);

    return start;
  });
}

function liveAmount(
  items: readonly {
    amountMinor: number;
    currency: CurrencyCode;
    voidedAt: string | null;
  }[],
  currency: CurrencyCode,
): number {
  return items
    .filter((item) => item.voidedAt === null && item.currency === currency)
    .reduce((total, item) => total + item.amountMinor, 0);
}

export function weeklyCashChart(
  facts: MetricsFacts,
  currency: CurrencyCode,
  now: Date,
): SeriesChart | null {
  const inflowTotal = liveAmount(facts.contributions, currency);
  const outflowTotal = liveAmount(facts.expenses, currency);

  if (inflowTotal === 0 && outflowTotal === 0) {
    return null;
  }

  const weeks = lastWeekStarts(now);
  const points = weeks.map((start) => {
    const key = start.toISOString().slice(0, 10);
    const inflow = facts.contributions
      .filter(
        (item) =>
          item.voidedAt === null &&
          item.currency === currency &&
          weekKey(parseDay(item.receivedAt)) === key,
      )
      .reduce((total, item) => total + item.amountMinor, 0);
    const outflow = facts.expenses
      .filter(
        (item) =>
          item.voidedAt === null &&
          item.currency === currency &&
          weekKey(parseDay(item.spentAt)) === key,
      )
      .reduce((total, item) => total + item.amountMinor, 0);

    return { key, label: weekLabel(start), values: { inflow, outflow } };
  });

  const average = Math.trunc(
    points.reduce((total, point) => total + (point.values["inflow"] ?? 0), 0) /
      WEEK_COUNT,
  );

  return {
    id: "weekly-cash",
    title: "Entradas y salidas por semana",
    unit: "money",
    currency,
    series: [
      { id: "inflow", label: "Recibido" },
      { id: "outflow", label: "Gastado" },
    ],
    points,
    signals: [
      { id: "average_inflow", label: "Promedio semanal recibido", value: average },
    ],
  };
}

export function cumulativeRaisedChart(
  weekly: SeriesChart | null,
  goalMinor: number | null,
): SeriesChart | null {
  if (weekly === null) {
    return null;
  }

  let running = 0;
  const points = weekly.points.map((point) => {
    running += point.values["inflow"] ?? 0;

    return { key: point.key, label: point.label, values: { raised: running } };
  });

  if (running === 0) {
    return null;
  }

  const signals: ChartSignal[] =
    goalMinor === null
      ? []
      : [{ id: "goal", label: "Objetivo interno", value: goalMinor }];

  return {
    id: "cumulative-raised",
    title: "Recibido acumulado",
    unit: "money",
    currency: weekly.currency,
    series: [{ id: "raised", label: "Recibido acumulado" }],
    points,
    signals,
  };
}

export function expensesByCategoryChart(
  facts: MetricsFacts,
  currency: CurrencyCode,
): BarChart | null {
  const bars = EXPENSE_CATEGORIES.map((category) => ({
    id: category,
    label: EXPENSE_CATEGORY_LABELS[category],
    value: liveAmount(
      facts.expenses.filter((item) => item.category === category),
      currency,
    ),
  })).filter((bar) => bar.value > 0);

  if (bars.length === 0) {
    return null;
  }

  return {
    id: "expenses-by-category",
    title: "Gastos por rubro",
    unit: "money",
    currency,
    bars,
    signals: [],
  };
}

export function otherCurrencyTotals(
  facts: MetricsFacts,
  primary: CurrencyCode,
): readonly ReturnType<typeof money>[] {
  const codes = [
    ...new Set(
      [...facts.contributions, ...facts.expenses]
        .filter((item) => item.voidedAt === null)
        .map((item) => item.currency),
    ),
  ]
    .filter((code) => code !== primary)
    .sort();

  return codes
    .map((code) =>
      sumMoney(
        facts.contributions
          .filter((item) => item.voidedAt === null && item.currency === code)
          .map((item) => money(item.amountMinor, code)),
        code,
      ),
    )
    .filter((amount) => amount.amountMinor !== 0);
}
