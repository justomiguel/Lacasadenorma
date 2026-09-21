/**
 * Errores del dominio. Existen para que un fallo tenga nombre: el principio XII
 * prohíbe que un error se degrade a un valor vacío sin avisar, y un `Error`
 * genérico no permite distinguir "el dato es inválido" de "no tenés permiso".
 *
 * La indisponibilidad de la fuente de datos **no** es una excepción de este
 * archivo: es un estado legítimo del sistema y se representa con el tipo
 * `DataResult` de la capa de aplicación, que obliga a la presentación a
 * manejarlo. Una excepción se puede olvidar en un `catch`; una unión
 * discriminada no se puede leer sin decidir qué hacer con cada caso.
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

/**
 * Un `23503` al borrar un ítem: quedó alguna referencia que no es una reserva.
 * Las reservas y los avisos ya se van en cascada.
 */
export class CatalogItemReferencedError extends DomainError {
  constructor() {
    super(
      "Hay reservas o entregas de este ítem; no se puede borrar. Despublicarlo lo saca del sitio.",
    );
    this.name = "CatalogItemReferencedError";
  }
}

/**
 * Anotar una entrega ya llegada por más unidades de las que el ítem admite.
 * Distinto de `CatalogOversubscribedError`: acá no hay que cancelar nada, el
 * cupo simplemente no alcanza.
 */
export class CatalogNoRoomError extends DomainError {
  constructor() {
    super("Ese ítem no tiene cupo para esa cantidad.");
    this.name = "CatalogNoRoomError";
  }
}

/** Alguien se adelantó: el `update` condicional no tocó ninguna fila. */
export class PledgeUnavailableError extends DomainError {
  constructor() {
    super("Alguien se adelantó.");
    this.name = "PledgeUnavailableError";
  }
}

/**
 * Admin vació nombre o teléfono de una reserva por teléfono.
 * Postgres levanta `datos_de_retiro`; el formulario lo pega a los dos campos.
 */
export class PledgeContactRequiredError extends DomainError {
  constructor() {
    super("Escribí el nombre y el teléfono para que el equipo sepa con quién habla.");
    this.name = "PledgeContactRequiredError";
  }
}

/**
 * Ya hay una campaña. Este sitio tiene una sola: gastos, aportes y el catálogo
 * se imputan a esa fila. Crear otra no es un alta, es un error de quien carga.
 */
export class CampaignExistsError extends DomainError {
  constructor() {
    super(
      "Ya hay una campaña. Los gastos, los aportes y el catálogo van sobre esa; no se crea otra.",
    );
    this.name = "CampaignExistsError";
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
