export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

/**
 * Puerto de logging. El dominio y la aplicación registran a través de esta
 * interfaz para no depender de una implementación concreta, y para que la
 * redacción de datos sensibles (amenaza I5) sea imposible de saltear.
 */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
