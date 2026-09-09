/**
 * Errores del dominio. Existen para que un fallo tenga nombre: el principio XII
 * prohíbe que un error se degrade a un valor vacío sin avisar, y un `Error`
 * genérico no permite distinguir "el dato es inválido" de "no tenés permiso".
 *
 * Hay sólo dos, y es a propósito. La indisponibilidad de la fuente de datos
 * **no** es una excepción de este archivo: es un estado legítimo del sistema y se
 * representa con el tipo `DataResult` de la capa de aplicación, que obliga a la
 * presentación a manejarlo. Una excepción se puede olvidar en un `catch`; una
 * unión discriminada no se puede leer sin decidir qué hacer con cada caso.
 */

/** Una regla del dominio no se cumple. Siempre es un error de programación. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Quien pide no tiene permiso. Se decide en el servidor, siempre. */
export class NotAuthorizedError extends Error {
  constructor(message = "No tenés permiso para hacer esto.") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}
