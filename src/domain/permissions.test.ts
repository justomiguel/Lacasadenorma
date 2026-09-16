import { describe, expect, it } from "vitest";

import { APP_ROLES, hasMinRole, isAppRole, roleRank } from "./entities/role";
import { can, permissionsOf, PERMISSIONS } from "./permissions";

describe("can", () => {
  it("no otorga nada sin rol", () => {
    for (const permission of PERMISSIONS) {
      expect(can(null, permission)).toBe(false);
    }
  });

  describe("auditor", () => {
    it("lee finanzas y auditoría", () => {
      expect(can("auditor", "finanzas.leer")).toBe(true);
      expect(can("auditor", "auditoria.leer")).toBe(true);
      expect(can("auditor", "backoffice.acceder")).toBe(true);
    });

    it("lee las donaciones comprometidas", () => {
      // Quien verifica el libro tiene que poder verificar también lo que llegó en
      // especie: si no, hay una parte de la ayuda recibida que nadie de afuera
      // puede revisar.
      expect(can("auditor", "donaciones.leer")).toBe(true);
    });

    it("no ve el tablero de métricas", () => {
      // Junta colas que un auditor recorre por sección. El permiso es de owner.
      expect(can("auditor", "metricas.leer")).toBe(false);
    });

    it("no escribe absolutamente nada", () => {
      // Es la razón por la que la tabla existe: con una jerarquía numérica,
      // "al menos auditor" habilitaría toda escritura, y el rol perdería su
      // sentido, que es dejar verificar sin poder alterar.
      const escrituras = PERMISSIONS.filter(
        (permission) =>
          permission.endsWith(".escribir") || permission.endsWith(".borrar"),
      );

      for (const permission of escrituras) {
        expect(can("auditor", permission)).toBe(false);
      }
    });
  });

  describe("editor", () => {
    it("escribe contenido e hitos", () => {
      expect(can("editor", "contenido.escribir")).toBe(true);
      expect(can("editor", "hitos.escribir")).toBe(true);
    });

    it("administra el catálogo de donaciones", () => {
      // Qué falta, cuánto y con qué foto es una decisión editorial: es la misma
      // persona que publica una novedad.
      expect(can("editor", "catalogo.escribir")).toBe(true);
    });

    it("no borra un ítem del catálogo", () => {
      // La policy `donation_items_delete` es admin+. Un tacho que la base va a
      // negar es peor que un tacho que no aparece (ADR-050).
      expect(can("editor", "catalogo.borrar")).toBe(false);
    });

    it("no ve ni toca plata", () => {
      // Privilegio mínimo real: quien publica una foto de la obra no necesita ver
      // quién aportó ni cuánto.
      expect(can("editor", "finanzas.leer")).toBe(false);
      expect(can("editor", "finanzas.escribir")).toBe(false);
      expect(can("editor", "auditoria.leer")).toBe(false);
    });

    it("no ve el tablero de métricas", () => {
      expect(can("editor", "metricas.leer")).toBe(false);
    });

    it("no ve ni una reserva de donación", () => {
      // La misma lección que obligó a escribir `can_read_ledger()`, aplicada a
      // datos personales: `editor` es de rango mayor que `auditor`, así que
      // cualquier permiso resuelto por jerarquía le abriría los nombres, los
      // correos y las notas privadas de quien se comprometió a donar algo. Dice
      // qué falta; no sabe quién lo trae.
      expect(can("editor", "donaciones.leer")).toBe(false);
      expect(can("editor", "donaciones.escribir")).toBe(false);
    });
  });

  describe("admin", () => {
    it("registra y anula movimientos, y edita la campaña", () => {
      expect(can("admin", "finanzas.escribir")).toBe(true);
      expect(can("admin", "campana.escribir")).toBe(true);
      expect(can("admin", "contenido.escribir")).toBe(true);
    });

    it("opera las donaciones comprometidas", () => {
      // Confirmar que algo llegó y cancelar con motivo. Es la operación que mueve
      // el contador de un ítem y la que puede llevar un nombre al muro.
      expect(can("admin", "donaciones.leer")).toBe(true);
      expect(can("admin", "donaciones.escribir")).toBe(true);
    });

    it("borra un ítem del catálogo que nadie tomó", () => {
      expect(can("admin", "catalogo.borrar")).toBe(true);
    });

    it("no administra cuentas bancarias ni roles, ni ve el tablero de métricas", () => {
      // Quien pueda cambiar un CBU puede desviar todos los aportes de la campaña.
      // No hay ninguna razón por la que un admin lo necesite.
      expect(can("admin", "cuentas.escribir")).toBe(false);
      expect(can("admin", "roles.escribir")).toBe(false);
      expect(can("admin", "metricas.leer")).toBe(false);
    });
  });

  describe("owner", () => {
    it("puede todo", () => {
      for (const permission of PERMISSIONS) {
        expect(can("owner", permission)).toBe(true);
      }
    });
  });

  it("declara una regla para cada permiso", () => {
    // Un permiso sin regla devolvería `undefined.includes`, que lanza. Que el test
    // exista significa que agregar un permiso nuevo sin decidir quién lo tiene
    // rompe la suite en lugar de romper una pantalla.
    for (const permission of PERMISSIONS) {
      expect(() => can("owner", permission)).not.toThrow();
    }
  });
});

describe("permissionsOf", () => {
  it("deriva las capacidades de la misma tabla", () => {
    expect(permissionsOf("editor")).toEqual(
      PERMISSIONS.filter((permission) => can("editor", permission)),
    );
  });

  it("devuelve una lista vacía sin rol", () => {
    expect(permissionsOf(null)).toEqual([]);
  });
});

describe("hasMinRole", () => {
  it("respeta el orden declarado en APP_ROLES", () => {
    expect(APP_ROLES).toEqual(["auditor", "editor", "admin", "owner"]);
    expect(roleRank("auditor")).toBeLessThan(roleRank("owner"));
    expect(hasMinRole("admin", "editor")).toBe(true);
    expect(hasMinRole("editor", "admin")).toBe(false);
    expect(hasMinRole(null, "auditor")).toBe(false);
  });
});

describe("isAppRole", () => {
  // Lo que llega en un token es `unknown`: el hook de acceso escribe
  // `app_metadata.user_role`, pero nada en el tipo garantiza qué hay ahí. Esta
  // guarda es la que decide si ese valor se convierte en permisos.
  it("acepta los cuatro roles declarados", () => {
    for (const role of APP_ROLES) {
      expect(isAppRole(role)).toBe(true);
    }
  });

  it("rechaza un rol inventado, aunque suene a rol", () => {
    expect(isAppRole("superadmin")).toBe(false);
    expect(isAppRole("Owner")).toBe(false);
    expect(isAppRole("")).toBe(false);
  });

  it("rechaza lo que no es una cadena", () => {
    expect(isAppRole(null)).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(isAppRole(3)).toBe(false);
    expect(isAppRole({ role: "owner" })).toBe(false);
    expect(isAppRole(["owner"])).toBe(false);
  });
});
