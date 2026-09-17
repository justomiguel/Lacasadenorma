import { CATALOG_ITEM_ID } from "./return-path";

/**
 * El primer paso de donar con mail: nombre y correo, para precargar el alta.
 *
 * Viaja en cookie httpOnly, no en la URL: un correo en la barra queda en
 * historial, logs de proxy y capturas. Diez minutos, como la vuelta al
 * catálogo (ADR-051).
 */

export const DONATE_INTENT_COOKIE = "donate-intent";

/** Diez minutos: alcanza para abrir el alta y confirmar el correo. */
export const DONATE_INTENT_MAX_AGE = 10 * 60;

export interface DonateIntent {
  readonly itemId: string;
  readonly name: string;
  readonly email: string;
}

export function serializeDonateIntent(intent: DonateIntent): string {
  return JSON.stringify(intent);
}

export function parseDonateIntent(raw: string | undefined): DonateIntent | null {
  if (raw === undefined || raw.length === 0) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value !== "object" || value === null) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const itemId = record["itemId"];
    const name = record["name"];
    const email = record["email"];

    if (typeof itemId !== "string" || !CATALOG_ITEM_ID.test(itemId)) {
      return null;
    }

    if (typeof name !== "string" || name.trim().length === 0) {
      return null;
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return null;
    }

    return { itemId, name: name.trim(), email: email.trim().toLowerCase() };
  } catch {
    return null;
  }
}
