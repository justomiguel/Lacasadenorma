import type { AnalyticsRead } from "../metrics-analytics";

/**
 * Lectura de alcance. Vive fuera de Postgres (ADR-010, ADR-049).
 */
export interface AnalyticsStatsPort {
  read(): Promise<AnalyticsRead>;
}
