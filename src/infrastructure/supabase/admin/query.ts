/**
 * Error de una consulta o de storage. El mensaje nombra la operación, no el
 * SQL: es lo que llega al log y a la pantalla de error (ADR-053).
 */
export class QueryError extends Error {
  readonly code: string | undefined;
  readonly details: string | undefined;
  readonly hint: string | undefined;
  readonly status: number | undefined;

  constructor(
    operation: string,
    cause: {
      message: string;
      code?: string | undefined;
      details?: string | undefined;
      hint?: string | undefined;
      status?: number | undefined;
    },
  ) {
    const code = cause.code === undefined ? "" : ` (${cause.code})`;
    const status = cause.status === undefined ? "" : ` [${String(cause.status)}]`;

    super(`${operation}: ${cause.message}${code}${status}`);
    this.name = "QueryError";
    this.code = cause.code;
    this.details = cause.details;
    this.hint = cause.hint;
    this.status = cause.status;
  }
}
