import type { AnalyticsRead } from "../metrics-analytics";

/**
 * Lectura de alcance. Vive fuera de Postgres (ADR-010, ADR-048).
 */
export interface AnalyticsStatsPort {
  read(): Promise<AnalyticsRead>;
}
