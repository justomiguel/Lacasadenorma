import { money, subtractMoney, type CurrencyCode } from "./money";
import { ratioAsPercentage } from "./percentage";
import type { MetricsCampaign, MetricsFacts, OwnerMetrics } from "./metrics";
import { collectSignals } from "./metrics-signals";
import { buildReach, collectReachSignals, type AnalyticsRead } from "./metrics-analytics";
import {
  catalogByCategoryChart,
  catalogCoverageChart,
  donorApprovalsChart,
  emailHealthChart,
  milestoneProgressChart,
  newsCadenceChart,
  pledgePipelineChart,
  pledgesByChannelChart,
} from "./metrics-counts";
import {
  cumulativeRaisedChart,
  expensesByCategoryChart,
  otherCurrencyTotals,
  weeklyCashChart,
} from "./metrics-series";

function primaryCurrency(
  campaign: MetricsCampaign | null,
  facts: MetricsFacts,
): CurrencyCode {
  return (
    campaign?.goal?.currency ??
    facts.contributions.find((item) => item.voidedAt === null)?.currency ??
    facts.expenses.find((item) => item.voidedAt === null)?.currency ??
    "ARS"
  );
}

function sumLive(
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

/**
 * El tablero: libro, gráficos y señales. Todo lo medible, nada personal.
 */
export function buildOwnerMetrics(
  campaign: MetricsCampaign | null,
  facts: MetricsFacts,
  now = new Date(),
  analytics: AnalyticsRead = { status: "absent" },
): OwnerMetrics {
  const currency = primaryCurrency(campaign, facts);
  const receivedMinor = sumLive(facts.contributions, currency);
  const spentMinor = sumLive(facts.expenses, currency);
  const received = money(receivedMinor, currency);
  const spent = money(spentMinor, currency);
  const weeklyCash = weeklyCashChart(facts, currency, now);
  const goalMinor =
    campaign?.goal?.currency === currency ? campaign.goal.amountMinor : null;

  return {
    headline: {
      currency,
      received,
      spent,
      balance: subtractMoney(received, spent),
      goal: campaign?.goal?.currency === currency ? campaign.goal : null,
      raisedPercent: ratioAsPercentage(receivedMinor, goalMinor),
      executedPercent: ratioAsPercentage(
        spentMinor,
        receivedMinor === 0 ? null : receivedMinor,
      ),
      liveContributionCount: facts.contributions.filter((item) => item.voidedAt === null)
        .length,
      liveExpenseCount: facts.expenses.filter((item) => item.voidedAt === null).length,
      unpublishedExpenseCount: facts.expenses.filter(
        (item) => item.voidedAt === null && item.publishedAt === null,
      ).length,
      activePledgeCount: facts.pledges.filter(
        (pledge) => pledge.status === "reserved" || pledge.status === "accepted",
      ).length,
      pendingDonorCount: facts.donors.filter(
        (donor) => donor.approvalStatus === "pending",
      ).length,
      otherCurrencies: otherCurrencyTotals(facts, currency),
    },
    weeklyCash,
    cumulativeRaised: cumulativeRaisedChart(weeklyCash, goalMinor),
    expensesByCategory: expensesByCategoryChart(facts, currency),
    pledgePipeline: pledgePipelineChart(facts),
    pledgesByChannel: pledgesByChannelChart(facts),
    catalogCoverage: catalogCoverageChart(facts),
    catalogByCategory: catalogByCategoryChart(facts),
    donorApprovals: donorApprovalsChart(facts),
    emailHealth: emailHealthChart(facts),
    milestoneProgress: milestoneProgressChart(facts),
    newsCadence: newsCadenceChart(facts),
    reach: buildReach(analytics),
    signals: [
      ...collectSignals(campaign, facts, now),
      ...collectReachSignals(analytics, now),
    ].sort((a, b) => rankOf(a.severity) - rankOf(b.severity) || a.id.localeCompare(b.id)),
  };
}

function rankOf(severity: "danger" | "warning" | "info"): number {
  if (severity === "danger") return 0;
  if (severity === "warning") return 1;
  return 2;
}
