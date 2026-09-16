import { normalizeDisplayName } from "./entities/donor";

/**
 * El primer paso de traer un bien (ADR-051): nombre, y teléfono o correo.
 *
 * El correo abre una cuenta. El teléfono reserva a nombre de esa persona
 * hasta que el owner confirma o suelta. Si vienen los dos, gana el correo:
 * eligieron el sistema.
 */

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type DonateStart =
  | { readonly channel: "email"; readonly name: string; readonly email: string }
  | { readonly channel: "phone"; readonly name: string; readonly phone: string };

export type DonateStartField =
  "contactName" | "email" | "contactPhone" | "contactChannel";

export type DonateStartResult =
  | { readonly status: "ok"; readonly value: DonateStart }
  | { readonly status: "error"; readonly field: DonateStartField };

export function parseDonateStart(input: {
  readonly name: string | null | undefined;
  readonly email?: string | null | undefined;
  readonly phone?: string | null | undefined;
}): DonateStartResult {
  const name = normalizeDisplayName(input.name);
  const email = input.email?.trim() ?? "";
  const phone = normalizeDisplayName(input.phone);

  if (name === null) {
    return { status: "error", field: "contactName" };
  }

  if (email.length > 0) {
    if (!EMAIL_SHAPE.test(email)) {
      return { status: "error", field: "email" };
    }

    return {
      status: "ok",
      value: { channel: "email", name, email: email.toLowerCase() },
    };
  }

  if (phone !== null) {
    if (!isPlausiblePhone(phone)) {
      return { status: "error", field: "contactPhone" };
    }

    return { status: "ok", value: { channel: "phone", name, phone } };
  }

  return { status: "error", field: "contactChannel" };
}

function isPlausiblePhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 6;
}
