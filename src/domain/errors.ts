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

/**
 * Bajar `needed_quantity` por debajo de lo ya comprometido.
 *
 * Postgres lo rechaza con `23514` y el nombre del check. Este error es la
 * traducción: el formulario del backoffice no puede mostrar un mensaje del
 * motor (US4 escenario 5).
 */
export class CatalogOversubscribedError extends DomainError {
  readonly committed: number;

  constructor(committed: number) {
    super(
      committed === 1
        ? "Hay 1 unidad comprometida; cancelala primero."
        : `Hay ${String(committed)} unidades comprometidas; cancelalas primero.`,
    );
    this.name = "CatalogOversubscribedError";
    this.committed = committed;
  }
}

/** Alguien se adelantó: el `update` condicional no tocó ninguna fila. */
export class PledgeUnavailableError extends DomainError {
  constructor() {
    super("Alguien se adelantó.");
    this.name = "PledgeUnavailableError";
  }
}

/** La cuenta ya tiene el tope de reservas activas. */
export class TooManyPledgesError extends DomainError {
  readonly active: number;

  constructor(active: number) {
    super(
      active === 1
        ? "Tenés 1 reserva activa; cancelá una para anotar otra."
        : `Tenés ${String(active)} reservas activas; cancelá una para anotar otra.`,
    );
    this.name = "TooManyPledgesError";
    this.active = active;
  }
}
