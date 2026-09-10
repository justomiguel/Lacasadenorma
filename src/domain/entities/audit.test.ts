import { describe, expect, it } from "vitest";

import { AUDIT_ACTION_LABELS, describeAuditAction, describeAuditEntity } from "./audit";

describe("descripción de la auditoría", () => {
  it("traduce una acción conocida a castellano", () => {
    expect(describeAuditAction("expense.voided")).toBe("anuló un gasto");
  });

  /**
   * El registro es permanente: va a contener acciones escritas por versiones
   * anteriores del código, incluidas las renombradas. Devolver la cadena cruda es peor
   * que una traducción y mucho mejor que una fila en blanco, que sería una falla
   * silenciosa justo en la pantalla que existe para que nada quede sin explicar.
   */
  it("devuelve la acción cruda cuando no la reconoce, en lugar de nada", () => {
    expect(describeAuditAction("expense.transmogrified")).toBe("expense.transmogrified");
  });

  it("traduce la tabla y también devuelve la cruda si no la conoce", () => {
    expect(describeAuditEntity("payment_methods")).toBe("Cuentas");
    expect(describeAuditEntity("tabla_futura")).toBe("tabla_futura");
  });

  /**
   * Las etiquetas se leen como parte de una oración —"Vos registraste un gasto"— así
   * que ninguna puede empezar en mayúscula ni terminar en punto. Es fácil de romper
   * agregando una entrada nueva, y el síntoma sería una fila con una mayúscula en el
   * medio.
   */
  it("todas las etiquetas encajan en una oración", () => {
    for (const label of Object.values(AUDIT_ACTION_LABELS)) {
      expect(label).toBe(label.toLowerCase().replace(/\.$/, ""));
    }
  });

  /**
   * La base tiene un `check` sobre `action` con esta misma expresión
   * (`audit_log_action_format`, migración 20260909120300). Una clave nueva que no la
   * cumpla compila, pasa los tests de la operación contra el puerto en memoria, y
   * recién falla contra Postgres, en el `insert` del rastro: o sea que hace fallar la
   * operación entera después de haberla hecho. Se comprueba acá para que el error
   * aparezca al agregar la clave.
   */
  it("todas las claves cumplen el `check` de la base", () => {
    for (const action of Object.keys(AUDIT_ACTION_LABELS)) {
      expect(action).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });
});
