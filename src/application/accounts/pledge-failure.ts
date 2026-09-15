import type { Logger } from "@/src/domain/ports/logger";

import {
  accountError,
  type AccountErrorCode,
  type AccountField,
  type AccountOutcome,
} from "./outcome";

/**
 * Traduce la excepción de una reserva a un código que la pantalla puede leer.
 *
 * Las funciones de la base levantan un mensaje corto (`sin_disponibilidad`,
 * `demasiadas_reservas`). Un mensaje de Postgres en pantalla no le dice nada a
 * quien lo lee (amenaza I6, principio XII).
 */
export function describePledgeFailure<T>(
  deps: { logger: Logger },
  describe: string,
  error: unknown,
): AccountOutcome<T> {
  const message = error instanceof Error ? error.message : "";
  const mapped = codeOf(message);

  if (mapped !== null) {
    if (mapped.code === "schemaBehind") {
      deps.logger.error(`No se pudo ${describe}`, { error });
    }

    return accountError(mapped.code, mapped.field);
  }

  deps.logger.error(`No se pudo ${describe}`, { error });

  return accountError("failed");
}

function codeOf(
  message: string,
): { code: AccountErrorCode; field: AccountField | null } | null {
  if (message.includes("sin_sesion")) {
    return { code: "noSession", field: null };
  }

  if (message.includes("sin_habilitacion")) {
    return { code: "notApproved", field: null };
  }

  if (message.includes("sin_disponibilidad")) {
    return { code: "ahead", field: null };
  }

  if (message.includes("demasiadas_reservas")) {
    return { code: "tooManyPledges", field: null };
  }

  if (message.includes("nombre_requerido")) {
    return { code: "displayNameRequired", field: "displayName" };
  }

  if (message.includes("datos_de_retiro")) {
    return { code: "pickupAddressRequired", field: "pickupAddress" };
  }

  if (message.includes("cantidad_invalida")) {
    return { code: "quantityInvalid", field: "quantity" };
  }

  if (message.includes("no_encontrada")) {
    return { code: "alreadyGone", field: null };
  }

  if (message.includes("PGRST202") || message.includes("schema cache")) {
    return { code: "schemaBehind", field: null };
  }

  return null;
}
