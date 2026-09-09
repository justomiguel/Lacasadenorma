import { z } from "zod";

import { COUNTRY_CODES, EXPENSE_CATEGORY_LABELS } from "@/src/domain/entities";
import type { CountryCode } from "@/src/domain/entities";
import { formatMoney, money, type CurrencyCode } from "@/src/domain/money";
import { formatPercentage } from "@/src/domain/percentage";

import { UNAVAILABLE_MESSAGES } from "../result";
import { getCampaignOverview } from "../use-cases/get-campaign-overview";
import { getDonationMethods } from "../use-cases/get-donation-methods";
import { getNormaStory } from "../use-cases/get-norma-story";
import { getReconstructionProgress } from "../use-cases/get-reconstruction-progress";
import { getTransparencyReport } from "../use-cases/get-transparency-report";
import { defineCapability } from "./types";
import type { AgentCapability, CapabilityDescriptor, CapabilityOutcome } from "./types";

/**
 * Las cinco capacidades del contrato, todas de sólo lectura.
 *
 * Cada una llama **el mismo caso de uso que usa la página**. No hay una consulta
 * paralela para agentes: la especificación de WebMCP nombra explícitamente la
 * divergencia entre el camino de la interfaz y el del agente como vulnerabilidad
 * (amenaza A5), y la única defensa real es que exista un solo camino.
 */

/** Entrada vacía y cerrada: un campo desconocido se rechaza, no se ignora. */
const noInput = z.strictObject({});

const countryInput = z.strictObject({
  country: z
    .enum(COUNTRY_CODES, { message: "El país tiene que ser AR, CL o US." })
    .optional(),
});

function unavailableOutcome<T>(
  reason: keyof typeof UNAVAILABLE_MESSAGES,
): CapabilityOutcome<T> {
  return { ok: false, code: "unavailable", message: UNAVAILABLE_MESSAGES[reason] };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignStatusOutput {
  readonly goalMinor: number | null;
  readonly raisedMinor: number;
  readonly percent: number | null;
  readonly currency: CurrencyCode;
  readonly reconciledAt: string | null;
  readonly updatedAt: string;
}

const getCampaignStatus: AgentCapability<Record<string, never>, CampaignStatusOutput> = {
  name: "get_campaign_status",
  title: "Estado de la recaudación",
  description:
    "Devuelve el objetivo, el monto recaudado, el porcentaje alcanzado, la moneda y la fecha de la última conciliación bancaria de la campaña de reconstrucción de La Casa de Norma. El porcentaje es nulo cuando el objetivo no está publicado.",
  input: noInput,
  readOnly: true,
  async run(_input, context) {
    const result = await getCampaignOverview({
      dataLayer: context.dataLayer,
      logger: context.logger,
    });

    if (result.status !== "ok") {
      return unavailableOutcome(result.reason);
    }

    const { campaign, fundraising } = result.data;

    return {
      ok: true,
      output: {
        goalMinor: campaign.goal?.amountMinor ?? null,
        raisedMinor: fundraising.raised.amountMinor,
        percent: fundraising.percent,
        currency: fundraising.raised.currency,
        reconciledAt: campaign.reconciledAt,
        updatedAt: new Date().toISOString(),
      },
    };
  },
  format(output) {
    const raised = formatMoney(money(output.raisedMinor, output.currency));
    const reconciled =
      output.reconciledAt === null
        ? "Todavía no hubo una conciliación bancaria."
        : `Cifras conciliadas al ${formatDate(output.reconciledAt)}.`;

    if (output.goalMinor === null || output.percent === null) {
      return `Se recaudaron ${raised}. El objetivo todavía no está publicado. ${reconciled}`;
    }

    const goal = formatMoney(money(output.goalMinor, output.currency));

    return `Se recaudaron ${raised} de un objetivo de ${goal} (${formatPercentage(output.percent)}). ${reconciled}`;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export interface DonationMethodsOutput {
  readonly methods: readonly {
    readonly country: string;
    readonly currency: CurrencyCode;
    readonly label: string;
    readonly kind: string;
    readonly fields: readonly { readonly label: string; readonly value: string }[];
    readonly instructions: string | null;
  }[];
}

const getDonationMethodsCapability: AgentCapability<
  { country?: CountryCode | undefined },
  DonationMethodsOutput
> = {
  name: "get_donation_methods",
  title: "Formas de colaborar",
  description:
    "Devuelve las formas publicadas de colaborar con la campaña: país, moneda, datos de la cuenta e instrucciones. Sólo incluye cuentas verificadas y publicadas. La lista vacía significa que ninguna cuenta está publicada.",
  input: countryInput,
  readOnly: true,
  async run(input, context) {
    const result = await getDonationMethods({
      dataLayer: context.dataLayer,
      logger: context.logger,
      ...(input.country === undefined ? {} : { country: input.country }),
    });

    if (result.status !== "ok") {
      return unavailableOutcome(result.reason);
    }

    return {
      ok: true,
      output: {
        methods: result.data.methods.map((method) => ({
          country: method.countryCode,
          currency: method.currency,
          label: method.label,
          kind: method.kind,
          fields: method.fields.map((field) => ({
            label: field.label,
            value: field.value,
          })),
          instructions: method.instructions,
        })),
      },
    };
  },
  format(output) {
    if (output.methods.length === 0) {
      return "Todavía no hay ninguna cuenta publicada para colaborar. Cuando la haya, va a estar en la página de aportes.";
    }

    return output.methods
      .map((method) => {
        const fields = method.fields
          .map((field) => `${field.label}: ${field.value}`)
          .join(" · ");

        return `${method.label} (${method.currency}). ${fields}`;
      })
      .join("\n");
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export interface ReconstructionProgressOutput {
  readonly milestones: readonly {
    readonly title: string;
    readonly status: string;
    readonly happenedOn: string | null;
  }[];
  readonly completedCount: number;
  readonly totalCount: number;
  readonly percentComplete: number | null;
  readonly budgetItems: readonly {
    readonly title: string;
    readonly estimatedMinor: number | null;
    readonly currency: CurrencyCode | null;
  }[];
}

const getReconstructionProgressCapability: AgentCapability<
  Record<string, never>,
  ReconstructionProgressOutput
> = {
  name: "get_reconstruction_progress",
  title: "Avance de la obra",
  description:
    "Devuelve los hitos publicados de la reconstrucción con su estado y su fecha, la cantidad de hitos completados sobre el total, y los rubros del presupuesto con su monto estimado cuando ya está cotizado. El porcentaje se calcula sobre hitos, no sobre dinero.",
  input: noInput,
  readOnly: true,
  async run(_input, context) {
    const result = await getReconstructionProgress({
      dataLayer: context.dataLayer,
      logger: context.logger,
    });

    if (result.status !== "ok") {
      return unavailableOutcome(result.reason);
    }

    const { milestones, budgetItems } = result.data;

    return {
      ok: true,
      output: {
        milestones: milestones.milestones.map((item) => ({
          title: item.title,
          status: item.status,
          happenedOn: item.happenedOn,
        })),
        completedCount: milestones.completedCount,
        totalCount: milestones.totalCount,
        percentComplete: milestones.percentComplete,
        budgetItems: budgetItems.map((item) => ({
          title: item.title,
          estimatedMinor: item.estimatedAmount?.amountMinor ?? null,
          currency: item.estimatedAmount?.currency ?? null,
        })),
      },
    };
  },
  format(output) {
    if (output.totalCount === 0) {
      return "Todavía no hay hitos de obra publicados.";
    }

    const done = `${String(output.completedCount)} de ${String(output.totalCount)} hitos completados`;
    const pending = output.milestones
      .filter((item) => item.status !== "completado")
      .map((item) => item.title)
      .join(", ");

    return pending.length === 0
      ? `${done}.`
      : `${done}. Pendientes o en curso: ${pending}.`;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export interface NormaStoryOutput {
  readonly name: string;
  readonly roleLabel: string;
  readonly place: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
  readonly bornOn: string | null;
  readonly diedOn: string | null;
}

const getNormaStoryCapability: AgentCapability<
  Record<string, never>,
  NormaStoryOutput
> = {
  name: "get_norma_story",
  title: "Quién fue Norma",
  description:
    "Devuelve la información pública sobre Norma: su nombre, su rol, el lugar donde vivió y el relato publicado sobre su vida. Las fechas de nacimiento y de muerte son nulas mientras la familia no las publique.",
  input: noInput,
  readOnly: true,
  run(_input, _context) {
    // El contenido editorial vive en el repositorio y está validado en build:
    // esta capacidad no puede quedar indisponible (ADR-007).
    return Promise.resolve({ ok: true, output: getNormaStory() });
  },
  format(output) {
    return `${output.name}. ${output.roleLabel}, ${output.place}. ${output.summary}`;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export interface TransparencySummaryOutput {
  readonly receivedMinor: number;
  readonly spentMinor: number;
  readonly balanceMinor: number;
  readonly currency: CurrencyCode;
  readonly executedPercent: number | null;
  readonly expenseCount: number;
  readonly receiptCount: number;
  readonly byCategory: readonly {
    readonly category: string;
    readonly amountMinor: number;
  }[];
  readonly reconciledAt: string | null;
  readonly detailUrl: string;
}

const getTransparencySummary: AgentCapability<
  Record<string, never>,
  TransparencySummaryOutput
> = {
  name: "get_transparency_summary",
  title: "Resumen de la rendición",
  description:
    "Devuelve el total recibido, el total gastado, el saldo, el porcentaje ejecutado, la cantidad de gastos y de comprobantes, el gasto por categoría y la fecha de la última conciliación. No incluye aportes individuales, identidades ni archivos de comprobantes.",
  input: noInput,
  readOnly: true,
  async run(_input, context) {
    const result = await getTransparencyReport({
      dataLayer: context.dataLayer,
      logger: context.logger,
    });

    if (result.status !== "ok") {
      return unavailableOutcome(result.reason);
    }

    const { summary } = result.data;

    return {
      ok: true,
      output: {
        receivedMinor: summary.primary.received.amountMinor,
        spentMinor: summary.primary.spent.amountMinor,
        balanceMinor: summary.primary.balance.amountMinor,
        currency: summary.primary.currency,
        executedPercent: summary.primary.executedPercent,
        expenseCount: summary.expenseCount,
        receiptCount: summary.receiptCount,
        byCategory: summary.byCategory.map((entry) => ({
          category: EXPENSE_CATEGORY_LABELS[entry.category],
          amountMinor: entry.amount.amountMinor,
        })),
        reconciledAt: summary.reconciledAt,
        detailUrl: `${context.siteUrl}/transparencia`,
      },
    };
  },
  format(output) {
    const received = formatMoney(money(output.receivedMinor, output.currency));
    const spent = formatMoney(money(output.spentMinor, output.currency));
    const balance = formatMoney(money(output.balanceMinor, output.currency));
    const reconciled =
      output.reconciledAt === null
        ? ""
        : ` Conciliado al ${formatDate(output.reconciledAt)}.`;

    return `Recibido ${received}, gastado ${spent}, saldo ${balance} en ${String(output.expenseCount)} gastos.${reconciled} Detalle completo en ${output.detailUrl}`;
  },
};

/** El orden es el del contrato, y hay un test que lo verifica. */
export const capabilityDescriptors: readonly CapabilityDescriptor[] = [
  defineCapability(getCampaignStatus),
  defineCapability(getDonationMethodsCapability),
  defineCapability(getReconstructionProgressCapability),
  defineCapability(getNormaStoryCapability),
  defineCapability(getTransparencySummary),
];
