import type { CountryCode } from "@/src/domain/entities";
import type { CurrencyCode } from "@/src/domain/money";

import { getDonationMethods } from "../use-cases/get-donation-methods";
import { countryInput, unavailableOutcome } from "./capability-helpers";
import type { AgentCapability } from "./types";

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

export const getDonationMethodsCapability: AgentCapability<
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
