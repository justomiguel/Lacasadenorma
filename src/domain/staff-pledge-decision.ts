/**
 * Los dos enlaces del correo al equipo: confirmar o soltar una reserva (ADR-051).
 *
 * No autentican. Piden la sesión de quien tiene `donaciones.escribir`. El GET
 * no muta: la confirmación es un POST (FR-237, FR-260).
 */

export const STAFF_PLEDGE_DECISIONS = ["si", "no"] as const;

export type StaffPledgeDecision = (typeof STAFF_PLEDGE_DECISIONS)[number];

/** Motivo de un no desde el correo. La función de cancelar lo exige. */
export const STAFF_CONTACT_REJECT_REASON = "El equipo no confirmó el contacto.";

export function isStaffPledgeDecision(value: string): value is StaffPledgeDecision {
  return (STAFF_PLEDGE_DECISIONS as readonly string[]).includes(value);
}

export function staffPledgeDecisionPath(
  pledgeId: string,
  decision: StaffPledgeDecision,
): string {
  return `/admin/donaciones/decidir/${pledgeId}/${decision}`;
}
