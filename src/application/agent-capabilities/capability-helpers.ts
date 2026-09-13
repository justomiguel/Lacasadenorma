import { z } from "zod";

import { COUNTRY_CODES } from "@/src/domain/entities";

import { UNAVAILABLE_MESSAGES } from "../result";
import type { CapabilityOutcome } from "./types";

/** Entrada vacía y cerrada: un campo desconocido se rechaza, no se ignora. */
export const noInput = z.strictObject({});

export const countryInput = z.strictObject({
  country: z
    .enum(COUNTRY_CODES, { message: "El país tiene que ser AR, CL o US." })
    .optional(),
});

export function unavailableOutcome<T>(
  reason: keyof typeof UNAVAILABLE_MESSAGES,
): CapabilityOutcome<T> {
  return { ok: false, code: "unavailable", message: UNAVAILABLE_MESSAGES[reason] };
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}
