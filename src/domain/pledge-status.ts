import { DomainError } from "./errors";

/**
 * La máquina de estados de una reserva.
 *
 * Las únicas transiciones legales, idénticas a las que imponen las funciones de
 * la base. Cancelada no tiene salida. `expire` no se escribe más; queda para
 * filas viejas. El sí y la llegada son dos pasos: no se salta.
 *
 *     reserved ──accept──▶ accepted ──fulfill──▶ fulfilled
 *         │                     │                      │
 *         ├────cancel───▶ cancelled                    └─cancel──▶ cancelled
 *         └────expire───▶ expired
 */

export const PLEDGE_STATUSES = [
  "reserved",
  "accepted",
  "fulfilled",
  "cancelled",
  "expired",
] as const;

export type PledgeStatus = (typeof PLEDGE_STATUSES)[number];

export const PLEDGE_EVENTS = ["accept", "fulfill", "cancel", "expire"] as const;

export type PledgeEvent = (typeof PLEDGE_EVENTS)[number];

/** Cancelada o vencida vieja: no admite ningún evento más. */
export function isPledgeStatus(value: unknown): value is PledgeStatus {
  return (
    typeof value === "string" && (PLEDGE_STATUSES as readonly string[]).includes(value)
  );
}

export function isPledgeEvent(value: unknown): value is PledgeEvent {
  return (
    typeof value === "string" && (PLEDGE_EVENTS as readonly string[]).includes(value)
  );
}

export function isTerminalPledge(status: PledgeStatus): boolean {
  return status === "cancelled" || status === "expired";
}

/**
 * El estado que resulta de aplicar un evento.
 *
 * Lanza si el evento no es legal desde ese estado. La interfaz pregunta esto
 * antes de ofrecer el control; la función de la base lo vuelve a comprobar.
 */
export function nextPledgeStatus(status: PledgeStatus, event: PledgeEvent): PledgeStatus {
  if (status === "reserved") {
    if (event === "accept") {
      return "accepted";
    }

    if (event === "cancel") {
      return "cancelled";
    }

    if (event === "expire") {
      return "expired";
    }
  }

  if (status === "accepted") {
    if (event === "fulfill") {
      return "fulfilled";
    }

    if (event === "cancel") {
      return "cancelled";
    }
  }

  if (status === "fulfilled" && event === "cancel") {
    return "cancelled";
  }

  throw new DomainError(`Una reserva ${status} no admite ${event}.`);
}
