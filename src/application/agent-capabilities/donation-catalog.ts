import { getCatalog } from "../use-cases/get-catalog";
import { noInput, unavailableOutcome } from "./capability-helpers";
import type { AgentCapability } from "./types";

export interface DonationCatalogOutput {
  readonly items: readonly {
    readonly title: string;
    readonly description: string | null;
    readonly unit: string;
    readonly needed: number;
    readonly remaining: number;
  }[];
  readonly updatedAt: string;
}

/**
 * Qué le falta a la casa, para un agente.
 *
 * Llama el mismo `getCatalog` que la página. No hay un camino paralelo, y no hay
 * forma de reservar: esta capacidad es de lectura, y reservar compromete a una
 * persona real frente a una familia (FR-242).
 */
export const getDonationCatalogCapability: AgentCapability<
  Record<string, never>,
  DonationCatalogOutput
> = {
  name: "get_donation_catalog",
  title: "Qué le falta a la casa",
  description:
    "Devuelve los ítems publicados de lo que le falta a la casa: título, descripción, unidad, cantidad necesaria y cantidad que todavía falta. No incluye nombres de quienes donan, ni el valor estimado, ni una forma de reservar.",
  input: noInput,
  readOnly: true,
  async run(_input, context) {
    const result = await getCatalog({
      dataLayer: context.dataLayer,
      logger: context.logger,
    });

    if (result.status !== "ok") {
      return unavailableOutcome(result.reason);
    }

    return {
      ok: true,
      output: {
        items: result.data.map((item) => ({
          title: item.title,
          description: item.description,
          unit: item.unit,
          needed: item.neededQuantity,
          remaining: item.remainingQuantity,
        })),
        updatedAt: new Date().toISOString(),
      },
    };
  },
  format(output) {
    if (output.items.length === 0) {
      return "Todavía no hay ítems publicados de lo que le falta a la casa. Cuando los haya, van a estar en la página del catálogo.";
    }

    return output.items
      .map(
        (item) =>
          `${item.title}: faltan ${String(item.remaining)} de ${String(item.needed)} (${item.unit}).`,
      )
      .join(" ");
  },
};
