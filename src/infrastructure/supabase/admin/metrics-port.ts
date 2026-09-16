import { isDonationItemCategory } from "@/src/domain/catalog";
import { isCoverChannel } from "@/src/domain/cover";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/src/domain/entities/expense";
import { isApprovalStatus } from "@/src/domain/entities/donor";
import {
  MILESTONE_STATUSES,
  type MilestoneStatus,
} from "@/src/domain/entities/milestone";
import { isEmailDeliveryStatus, type MetricsFacts } from "@/src/domain/metrics";
import { isCurrencyCode, type CurrencyCode } from "@/src/domain/money";
import { isPledgeStatus } from "@/src/domain/pledge-status";
import type { AdminMetricsPort } from "@/src/domain/ports/admin";

import { MappingError } from "../mappers";
import type { ServerSupabaseClient } from "../server-client";
import { QueryError } from "./query";

function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

function isMilestoneStatus(value: string): value is MilestoneStatus {
  return (MILESTONE_STATUSES as readonly string[]).includes(value);
}

function currencyOf(value: unknown, what: string): CurrencyCode {
  if (typeof value !== "string") {
    throw new MappingError(`${what} trajo una moneda que el dominio no conoce.`);
  }

  const code = value.trim();
  if (!isCurrencyCode(code)) {
    throw new MappingError(`${what} trajo una moneda que el dominio no conoce.`);
  }

  return code;
}

/**
 * Hechos del tablero. Cada consulta pide columnas agregables, nunca un correo.
 */
export function createMetricsPort(client: ServerSupabaseClient): AdminMetricsPort {
  return {
    async readSnapshot(campaignId): Promise<MetricsFacts> {
      const [
        contributionsRes,
        expensesRes,
        itemsRes,
        updatesRes,
        milestonesRes,
        methodsRes,
        donorsRes,
        emailsRes,
      ] = await Promise.all([
        client
          .from("contributions")
          .select("amount_minor, currency, received_at, voided_at")
          .eq("campaign_id", campaignId),
        client
          .from("expenses")
          .select(
            "amount_minor, currency, spent_at, category, receipt_count, voided_at, published_at",
          )
          .eq("campaign_id", campaignId),
        client
          .from("donation_items")
          .select(
            "id, needed_quantity, reserved_quantity, fulfilled_quantity, published_at, category",
          )
          .eq("campaign_id", campaignId),
        client.from("updates").select("published_at").eq("campaign_id", campaignId),
        client.from("milestones").select("status").eq("campaign_id", campaignId),
        client
          .from("payment_methods")
          .select("published_at")
          .eq("campaign_id", campaignId),
        client.from("donor_profiles").select("approval_status"),
        client.from("email_deliveries").select("status"),
      ]);

      for (const [label, error] of [
        ["aportes", contributionsRes.error],
        ["gastos", expensesRes.error],
        ["catálogo", itemsRes.error],
        ["novedades", updatesRes.error],
        ["hitos", milestonesRes.error],
        ["cuentas", methodsRes.error],
        ["donantes", donorsRes.error],
        ["correos", emailsRes.error],
      ] as const) {
        if (error !== null) {
          throw new QueryError(`leer ${label} del tablero`, error);
        }
      }

      const items = itemsRes.data ?? [];
      const itemIds = items.map((row) => row.id);
      const pledgesRes =
        itemIds.length === 0
          ? { data: [], error: null }
          : await client
              .from("donation_pledges")
              .select("status, quantity, cover_channel, expires_at, reminded_at")
              .in("item_id", itemIds);

      if (pledgesRes.error !== null) {
        throw new QueryError("leer reservas del tablero", pledgesRes.error);
      }

      return {
        contributions: (contributionsRes.data ?? []).map((row) => ({
          amountMinor: row.amount_minor,
          currency: currencyOf(row.currency, "un aporte"),
          receivedAt: row.received_at,
          voidedAt: row.voided_at,
        })),
        expenses: (expensesRes.data ?? []).map((row) => {
          if (!isExpenseCategory(row.category)) {
            throw new MappingError("un gasto del tablero no se pudo traducir");
          }

          return {
            amountMinor: row.amount_minor,
            currency: currencyOf(row.currency, "un gasto"),
            spentAt: row.spent_at,
            category: row.category,
            receiptCount: row.receipt_count,
            voidedAt: row.voided_at,
            publishedAt: row.published_at,
          };
        }),
        pledges: (pledgesRes.data ?? []).map((row) => {
          if (!isPledgeStatus(row.status) || !isCoverChannel(row.cover_channel)) {
            throw new MappingError("una reserva del tablero no se pudo traducir");
          }

          return {
            status: row.status,
            quantity: row.quantity,
            coverChannel: row.cover_channel,
            expiresAt: row.expires_at,
            remindedAt: row.reminded_at,
          };
        }),
        donors: (donorsRes.data ?? []).map((row) => {
          if (!isApprovalStatus(row.approval_status)) {
            throw new MappingError(
              "una cuenta del público del tablero no se pudo traducir",
            );
          }

          return { approvalStatus: row.approval_status };
        }),
        catalog: items.map((row) => {
          if (!isDonationItemCategory(row.category)) {
            throw new MappingError(
              "un ítem del catálogo del tablero no se pudo traducir",
            );
          }

          return {
            needed: row.needed_quantity,
            reserved: row.reserved_quantity,
            fulfilled: row.fulfilled_quantity,
            publishedAt: row.published_at,
            category: row.category,
          };
        }),
        updates: (updatesRes.data ?? []).map((row) => ({
          publishedAt: row.published_at,
        })),
        milestones: (milestonesRes.data ?? []).map((row) => {
          if (!isMilestoneStatus(row.status)) {
            throw new MappingError("un hito del tablero no se pudo traducir");
          }

          return { status: row.status };
        }),
        paymentMethods: (methodsRes.data ?? []).map((row) => ({
          publishedAt: row.published_at,
        })),
        emails: (emailsRes.data ?? []).map((row) => {
          if (!isEmailDeliveryStatus(row.status)) {
            throw new MappingError("un correo del tablero no se pudo traducir");
          }

          return { status: row.status };
        }),
      };
    },
  };
}
