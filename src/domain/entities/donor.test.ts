import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_BY_DEFAULT,
  canAppearNamed,
  canReserve,
  displayNameOf,
  normalizeDisplayName,
  type DonorProfile,
} from "./donor";

function profile(overrides: Partial<DonorProfile> = {}): DonorProfile {
  return {
    userId: "00000000-0000-4000-8000-000000000001",
    displayName: null,
    locale: "es",
    defaultAnonymous: true,
    approvalStatus: "pending",
    ...overrides,
  };
}

describe("normalizeDisplayName", () => {
  // Nulo significa "todavía no decidí aparecer". Una cadena de espacios significa lo
  // mismo y se publicaría como un renglón vacío en el muro, así que las dos formas
  // de no haber decidido tienen que colapsar en una.
  it("colapsa en nulo todo lo que no es un nombre", () => {
    expect(normalizeDisplayName(null)).toBeNull();
    expect(normalizeDisplayName(undefined)).toBeNull();
    expect(normalizeDisplayName("")).toBeNull();
    expect(normalizeDisplayName("   ")).toBeNull();
    expect(normalizeDisplayName("\n\t ")).toBeNull();
  });

  it("recorta los bordes y deja el nombre intacto por dentro", () => {
    expect(normalizeDisplayName("  Norma  ")).toBe("Norma");
    expect(normalizeDisplayName("Vecina de la cuadra")).toBe("Vecina de la cuadra");
  });
});

describe("displayNameOf", () => {
  it("devuelve el nombre que la persona eligió", () => {
    expect(displayNameOf(profile({ displayName: "Quien ayuda" }))).toBe("Quien ayuda");
  });

  it("devuelve nulo cuando no eligió ninguno", () => {
    // Y es lo único que puede devolver. No hay un camino que derive un nombre del
    // correo: "juanperez" no es un nombre que alguien decidió publicar (FR-230).
    // Que la función no reciba el correo es la garantía, no una convención.
    expect(displayNameOf(profile())).toBeNull();
  });
});

describe("canAppearNamed", () => {
  it("no puede aparecer con nombre quien no eligió uno", () => {
    expect(canAppearNamed(profile({ defaultAnonymous: false }))).toBe(false);
  });

  it("puede aparecer con nombre quien eligió uno y no quiere ser anónima", () => {
    expect(
      canAppearNamed(profile({ displayName: "Quien ayuda", defaultAnonymous: false })),
    ).toBe(true);
  });

  it("no aparece quien tiene nombre y prefiere el anonimato", () => {
    // El nombre guardado no es permiso para publicarlo. Alguien puede haberlo
    // escrito y después cambiar de opinión, y el estado intermedio existe.
    expect(
      canAppearNamed(profile({ displayName: "Quien ayuda", defaultAnonymous: true })),
    ).toBe(false);
  });

  it("no aparece quien guardó espacios como nombre", () => {
    expect(canAppearNamed(profile({ displayName: "   ", defaultAnonymous: false }))).toBe(
      false,
    );
  });
});

describe("canReserve", () => {
  it("una cuenta nueva no reserva: confirmar el correo no es habilitación", () => {
    expect(canReserve(profile())).toBe(false);
    expect(canReserve(profile({ approvalStatus: "declined" }))).toBe(false);
  });

  it("sólo la cuenta habilitada por el equipo puede reservar", () => {
    expect(canReserve(profile({ approvalStatus: "approved" }))).toBe(true);
  });
});

describe("ANONYMOUS_BY_DEFAULT", () => {
  it("es el anonimato", () => {
    // Aparecer con nombre es una decisión explícita (FR-225). Esta constante es el
    // valor que la interfaz usa cuando nadie eligió nada, y tiene que coincidir con
    // el `default true` de la columna: si los dos se separan, el caso que ocurre
    // cuando nadie decide deja de ser el seguro.
    expect(ANONYMOUS_BY_DEFAULT).toBe(true);
  });
});
