import { DomainError } from "./errors";

/**
 * La máquina de estados de una reserva.
 *
 * Las únicas transiciones legales, idénticas a las que imponen las funciones de
 * la base. Desde un estado terminal no se sale: una donación entregada por error
 * se corrige con una fila nueva y una cancelación con motivo, igual que un
 * aporte mal registrado no se edita.
 *
 *     reserved ──fulfill──▶ fulfilled
 *         │
 *         ├────cancel───▶ cancelled
 *         └────expire───▶ expired
 */

export const PLEDGE_STATUSES = ["reserved", "fulfilled", "cancelled", "expired"] as const;

export type PledgeStatus = (typeof PLEDGE_STATUSES)[number];

export const PLEDGE_EVENTS = ["fulfill", "cancel", "expire"] as const;

export type PledgeEvent = (typeof PLEDGE_EVENTS)[number];

const NEXT: Record<PledgeEvent, PledgeStatus> = {
  fulfill: "fulfilled",
  cancel: "cancelled",
  expire: "expired",
};

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

/** Cumplida, cancelada o vencida: no admite ningún evento más. */
export function isTerminalPledge(status: PledgeStatus): boolean {
  return status !== "reserved";
}

/**
 * El estado que resulta de aplicar un evento.
 *
 * Lanza si el estado actual es terminal. La interfaz pregunta esto antes de
 * ofrecer el control; la función de la base lo vuelve a comprobar.
 */
export function nextPledgeStatus(status: PledgeStatus, event: PledgeEvent): PledgeStatus {
  if (isTerminalPledge(status)) {
    throw new DomainError(`Una reserva ${status} no admite ${event}.`);
  }

  return NEXT[event];
}
