import { describe, expect, it } from "vitest";

import { CatalogOversubscribedError, DomainError, NotAuthorizedError } from "./errors";

describe("DomainError", () => {
  it("lleva nombre propio, para poder distinguirlo en un catch", () => {
    const error = new DomainError("El monto tiene que ser un entero.");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DomainError");
    expect(error.message).toBe("El monto tiene que ser un entero.");
  });
});

describe("NotAuthorizedError", () => {
  it("tiene un mensaje por defecto que se le puede mostrar a una persona", () => {
    // El mensaje por defecto es el que ve alguien que entró a una pantalla que no
    // le corresponde. No dice qué existe del otro lado: que a un `editor` le falte
    // permiso no es motivo para contarle qué hay en la pantalla de cuentas.
    const error = new NotAuthorizedError();

    expect(error.name).toBe("NotAuthorizedError");
    expect(error.message).toBe("No tenés permiso para hacer esto.");
  });

  it("admite un mensaje propio cuando el caso concreto agrega algo", () => {
    const error = new NotAuthorizedError("Sólo el dueño puede publicar una cuenta.");

    expect(error.message).toBe("Sólo el dueño puede publicar una cuenta.");
  });

  it("no es un DomainError: son dos fallas distintas", () => {
    // Un `DomainError` es un error de programación; una falta de permiso es un
    // resultado esperado del sistema. Confundirlos haría que un `catch` pensado
    // para uno tape al otro.
    expect(new NotAuthorizedError()).not.toBeInstanceOf(DomainError);
    expect(new DomainError("x")).not.toBeInstanceOf(NotAuthorizedError);
  });
});

describe("CatalogOversubscribedError", () => {
  it("traduce una unidad al singular", () => {
    const error = new CatalogOversubscribedError(1);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe("CatalogOversubscribedError");
    expect(error.committed).toBe(1);
    expect(error.message).toBe("Hay 1 unidad comprometida; cancelala primero.");
  });

  it("nombra las unidades comprometidas, no el error de Postgres (US4 escenario 5)", () => {
    const error = new CatalogOversubscribedError(3);

    expect(error.message).toBe("Hay 3 unidades comprometidas; cancelalas primero.");
  });
});
