export const MILESTONE_STATUSES = ["pendiente", "en_curso", "completado"] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completado: "Completado",
};

export interface MilestoneRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: MilestoneStatus;
  /** Nulo mientras el hito no ocurrió. No se estima una fecha. */
  readonly happenedOn: string | null;
  readonly sortOrder: number;
}
