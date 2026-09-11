import { describe, expect, it } from "vitest";

import { formatLongDate } from "./dates";

describe("formatLongDate", () => {
  it("escribe el día sin cero a la izquierda y el mes completo", () => {
    // "08 de sept de 2026" era lo que mostraba el libro de gastos, y no es ni el
    // formato del resto del sitio ni castellano prolijo.
    expect(formatLongDate("2026-09-08")).toBe("8 de septiembre de 2026");
  });

  it("no corre la fecha un día para atrás", () => {
    // Sin `timeZone: "UTC"`, esta misma cadena se muestra como el 31 de agosto en
    // cualquier huso al oeste de Greenwich, incluido el de Formosa. Un gasto
    // fechado un día antes que en el resumen del banco no se puede conciliar.
    expect(formatLongDate("2026-09-01")).toBe("1 de septiembre de 2026");
    expect(formatLongDate("2026-01-01")).toBe("1 de enero de 2026");
  });

  it("es el mismo formato para cualquier mes", () => {
    expect(formatLongDate("2026-03-15")).toBe("15 de marzo de 2026");
    expect(formatLongDate("2026-12-31")).toBe("31 de diciembre de 2026");
  });
});
