import { describe, expect, it } from "vitest";

import { keepStaleOnError, ok, unavailable } from "./result";

describe("keepStaleOnError", () => {
  it("deja pasar una lectura que salió bien", () => {
    const result = ok(["techo"]);

    expect(keepStaleOnError(result)).toBe(result);
  });

  it("deja pasar un estado estable: sin base o sin publicar", () => {
    expect(keepStaleOnError(unavailable("not-configured"))).toEqual({
      status: "unavailable",
      reason: "not-configured",
    });
    expect(keepStaleOnError(unavailable("not-published"))).toEqual({
      status: "unavailable",
      reason: "not-published",
    });
  });

  it("no deja hornear un fallo transitorio en la caché de ISR", () => {
    // Next trata un render que termina —aunque sea con el aviso de "no
    // disponible"— como éxito y reemplaza la página buena. Tirar acá es lo que
    // hace que la revalidación conserve la última versión con datos.
    expect(() => keepStaleOnError(unavailable("error"))).toThrow(/lectura viva/i);
  });

  it("en el build pinta el cascarón: no hay página previa que conservar", () => {
    const previous = process.env["NEXT_PHASE"];
    process.env["NEXT_PHASE"] = "phase-production-build";

    try {
      expect(keepStaleOnError(unavailable("error"))).toEqual({
        status: "unavailable",
        reason: "error",
      });
    } finally {
      if (previous === undefined) {
        delete process.env["NEXT_PHASE"];
      } else {
        process.env["NEXT_PHASE"] = previous;
      }
    }
  });
});
