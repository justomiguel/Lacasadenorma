/**
 * Errores del dominio. Existen para que un fallo tenga nombre: el principio XII
 * prohíbe que un error se degrade a un valor vacío sin avisar, y un `Error`
 * genérico no permite distinguir "el dato es inválido" de "la base no responde".
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * La fuente de datos no está disponible. Se propaga hasta la presentación, que
 * muestra el contenido editorial y omite las cifras con un aviso (FR-034).
 * Nunca se traduce a ceros: un cero silencioso es un dato falso.
 */
export class DataSourceUnavailableError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DataSourceUnavailableError";
  }
}

/** Quien pide no tiene permiso. Se decide en el servidor, siempre. */
export class NotAuthorizedError extends Error {
  constructor(message = "No tenés permiso para hacer esto.") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}
