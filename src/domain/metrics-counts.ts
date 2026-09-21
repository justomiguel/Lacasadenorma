import { COVER_CHANNELS, type CoverChannel } from "./cover";
import { remaining } from "./catalog";
import {
  DONATION_ITEM_CATEGORIES,
  DONATION_ITEM_CATEGORY_LABELS,
} from "./entities/donation-item";
import { APPROVAL_STATUSES } from "./entities/donor";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABELS } from "./entities/milestone";
import { PLEDGE_STATUSES, type PledgeStatus } from "./pledge-status";
import { EMAIL_DELIVERY_STATUSES } from "./metrics";
import type { BarChart, MetricsFacts } from "./metrics";

export const COVER_CHANNEL_LABELS: Record<CoverChannel, string> = {
  bring: "Lo trae",
  transfer: "Transferencia",
  mercadopago: "Mercado Pago",
  paypal: "PayPal",
};

export const PLEDGE_STATUS_LABELS: Record<PledgeStatus, string> = {
  reserved: "En curso",
  accepted: "Pendiente de entrega",
  fulfilled: "Llegó",
  cancelled: "Cancelada",
  expired: "Vencida",
};

export function countBar(
  id: string,
  title: string,
  bars: readonly { id: string; label: string; value: number }[],
  includeZeros: boolean,
): BarChart | null {
  const visible = includeZeros ? bars : bars.filter((bar) => bar.value > 0);

  if (visible.length === 0 || visible.every((bar) => bar.value === 0)) {
    return null;
  }

  return { id, title, unit: "count", currency: null, bars: visible, signals: [] };
}

export function pledgePipelineChart(facts: MetricsFacts): BarChart | null {
  return countBar(
    "pledge-pipeline",
    "Reservas por estado",
    PLEDGE_STATUSES.map((status) => ({
      id: status,
      label: PLEDGE_STATUS_LABELS[status],
      value: facts.pledges.filter((pledge) => pledge.status === status).length,
    })),
    true,
  );
}

export function pledgesByChannelChart(facts: MetricsFacts): BarChart | null {
  return countBar(
    "pledges-by-channel",
    "Reservas por canal",
    COVER_CHANNELS.map((channel) => ({
      id: channel,
      label: COVER_CHANNEL_LABELS[channel],
      value: facts.pledges.filter((pledge) => pledge.coverChannel === channel).length,
    })),
    false,
  );
}

export function catalogCoverageChart(facts: MetricsFacts): BarChart | null {
  if (facts.catalog.length === 0) {
    return null;
  }

  const fulfilled = facts.catalog.reduce((total, item) => total + item.fulfilled, 0);
  const reserved = facts.catalog.reduce((total, item) => total + item.reserved, 0);
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

  return countBar(
    "catalog-coverage",
    "Catálogo en unidades",
    [
      { id: "fulfilled", label: "Llegó", value: fulfilled },
      { id: "reserved", label: "Reservado", value: reserved },
      { id: "remaining", label: "Falta", value: leftover },
    ],
    true,
  );
}

export function catalogByCategoryChart(facts: MetricsFacts): BarChart | null {
  return countBar(
    "catalog-by-category",
    "Lo que falta, por categoría",
    DONATION_ITEM_CATEGORIES.map((category) => ({
      id: category,
      label: DONATION_ITEM_CATEGORY_LABELS[category],
      value: facts.catalog
        .filter((item) => item.category === category)
        .reduce(
          (total, item) =>
            total +
            remaining({
              needed: item.needed,
              reserved: item.reserved,
              fulfilled: item.fulfilled,
            }),
          0,
        ),
    })),
    false,
  );
}

export function donorApprovalsChart(facts: MetricsFacts): BarChart | null {
  return countBar(
    "donor-approvals",
    "Cuentas del público",
    APPROVAL_STATUSES.map((status) => ({
      id: status,
      label:
        status === "pending"
          ? "Para revisar"
          : status === "approved"
            ? "Habilitadas"
            : "Rechazadas",
      value: facts.donors.filter((donor) => donor.approvalStatus === status).length,
    })),
    true,
  );
}

export function emailHealthChart(facts: MetricsFacts): BarChart | null {
  return countBar(
    "email-health",
    "Correos del producto",
    EMAIL_DELIVERY_STATUSES.map((status) => ({
      id: status,
      label:
        status === "sent" ? "Enviados" : status === "failed" ? "Fallidos" : "Salteados",
      value: facts.emails.filter((email) => email.status === status).length,
    })),
    true,
  );
}

export function milestoneProgressChart(facts: MetricsFacts): BarChart | null {
  return countBar(
    "milestone-progress",
    "Hitos de la obra",
    MILESTONE_STATUSES.map((status) => ({
      id: status,
      label: MILESTONE_STATUS_LABELS[status],
      value: facts.milestones.filter((item) => item.status === status).length,
    })),
    true,
  );
}

export function newsCadenceChart(facts: MetricsFacts): BarChart | null {
  return countBar(
    "news-cadence",
    "Novedades",
    [
      {
        id: "published",
        label: "Publicadas",
        value: facts.updates.filter((item) => item.publishedAt !== null).length,
      },
      {
        id: "draft",
        label: "Borradores",
        value: facts.updates.filter((item) => item.publishedAt === null).length,
      },
    ],
    true,
  );
}
