import type { ApprovalStatus } from "./entities/donor";
import type { DonationItemCategory } from "./entities/donation-item";
import type { ExpenseCategory } from "./entities/expense";
import type { MilestoneStatus } from "./entities/milestone";
import type { Campaign } from "./entities/campaign";
import type { CoverChannel } from "./cover";
import type { PledgeStatus } from "./pledge-status";
import type { CurrencyCode, Money } from "./money";
import type { OwnerReach } from "./metrics-analytics";

/**
 * Los hechos que el tablero puede medir.
 *
 * No hay nombres, correos ni notas: con esto se grafica y se señalan
 * excepciones, y no hay forma de filtrar un dato personal desde la capa de
 * agregación (FR-608, ADR-048).
 */

export interface MetricsContribution {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly receivedAt: string;
  readonly voidedAt: string | null;
}

export interface MetricsExpense {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly spentAt: string;
  readonly category: ExpenseCategory;
  readonly receiptCount: number;
  readonly voidedAt: string | null;
  readonly publishedAt: string | null;
}

export interface MetricsPledge {
  readonly status: PledgeStatus;
  readonly quantity: number;
  readonly coverChannel: CoverChannel;
  readonly expiresAt: string;
  readonly remindedAt: string | null;
}

export interface MetricsDonor {
  readonly approvalStatus: ApprovalStatus;
}

export interface MetricsCatalogItem {
  readonly needed: number;
  readonly reserved: number;
  readonly fulfilled: number;
  readonly publishedAt: string | null;
  readonly category: DonationItemCategory;
}

export interface MetricsUpdate {
  readonly publishedAt: string | null;
}

export interface MetricsMilestone {
  readonly status: MilestoneStatus;
}

export interface MetricsPaymentMethod {
  readonly publishedAt: string | null;
}

export const EMAIL_DELIVERY_STATUSES = ["sent", "failed", "skipped"] as const;

export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];

export interface MetricsEmail {
  readonly status: EmailDeliveryStatus;
}

export interface MetricsFacts {
  readonly contributions: readonly MetricsContribution[];
  readonly expenses: readonly MetricsExpense[];
  readonly pledges: readonly MetricsPledge[];
  readonly donors: readonly MetricsDonor[];
  readonly catalog: readonly MetricsCatalogItem[];
  readonly updates: readonly MetricsUpdate[];
  readonly milestones: readonly MetricsMilestone[];
  readonly paymentMethods: readonly MetricsPaymentMethod[];
  readonly emails: readonly MetricsEmail[];
}

export type SignalSeverity = "info" | "warning" | "danger";

export interface MetricSignal {
  readonly id: string;
  readonly severity: SignalSeverity;
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly count: number;
}

export interface ChartSeries {
  readonly id: string;
  readonly label: string;
}

export interface ChartPoint {
  readonly key: string;
  readonly label: string;
  readonly values: Readonly<Record<string, number>>;
}

export interface ChartSignal {
  readonly id: string;
  readonly label: string;
  readonly value: number;
}

export type ChartUnit = "money" | "count";

export interface SeriesChart {
  readonly id: string;
  readonly title: string;
  readonly unit: ChartUnit;
  readonly currency: CurrencyCode | null;
  readonly series: readonly ChartSeries[];
  readonly points: readonly ChartPoint[];
  readonly signals: readonly ChartSignal[];
}

export interface BarSlice {
  readonly id: string;
  readonly label: string;
  readonly value: number;
}

export interface BarChart {
  readonly id: string;
  readonly title: string;
  readonly unit: ChartUnit;
  readonly currency: CurrencyCode | null;
  readonly bars: readonly BarSlice[];
  readonly signals: readonly ChartSignal[];
}

export interface MetricsHeadline {
  readonly currency: CurrencyCode;
  readonly received: Money;
  readonly spent: Money;
  readonly balance: Money;
  readonly goal: Money | null;
  readonly raisedPercent: number | null;
  readonly executedPercent: number | null;
  readonly liveContributionCount: number;
  readonly liveExpenseCount: number;
  readonly unpublishedExpenseCount: number;
  readonly activePledgeCount: number;
  readonly pendingDonorCount: number;
  readonly otherCurrencies: readonly Money[];
}

export interface OwnerMetrics {
  readonly headline: MetricsHeadline;
  readonly weeklyCash: SeriesChart | null;
  readonly cumulativeRaised: SeriesChart | null;
  readonly expensesByCategory: BarChart | null;
  readonly pledgePipeline: BarChart | null;
  readonly pledgesByChannel: BarChart | null;
  readonly catalogCoverage: BarChart | null;
  readonly catalogByCategory: BarChart | null;
  readonly donorApprovals: BarChart | null;
  readonly emailHealth: BarChart | null;
  readonly milestoneProgress: BarChart | null;
  readonly newsCadence: BarChart | null;
  readonly reach: OwnerReach;
  readonly signals: readonly MetricSignal[];
}

export type MetricsCampaign = Pick<Campaign, "goal" | "reconciledAt">;

export const EMPTY_METRICS_FACTS: MetricsFacts = {
  contributions: [],
  expenses: [],
  pledges: [],
  donors: [],
  catalog: [],
  updates: [],
  milestones: [],
  paymentMethods: [],
  emails: [],
};

export function isEmailDeliveryStatus(value: string): value is EmailDeliveryStatus {
  return (EMAIL_DELIVERY_STATUSES as readonly string[]).includes(value);
}
