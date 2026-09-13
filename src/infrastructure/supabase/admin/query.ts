/**
 * Error de una consulta o de storage del backoffice. El mensaje nombra la
 * operación, no el SQL: es lo que llega al log y a quien está cargando un gasto.
 */
export class QueryError extends Error {
  constructor(operation: string, cause: { message: string; code?: string }) {
    super(
      `${operation}: ${cause.message}${cause.code === undefined ? "" : ` (${cause.code})`}`,
    );
    this.name = "QueryError";
  }
}
