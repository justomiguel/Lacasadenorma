import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_BY_DEFAULT,
  canAppearNamed,
  canReserve,
  displayNameOf,
  isOwnPortraitPath,
  normalizeDisplayName,
  portraitPathFor,
  type DonorProfile,
} from "./donor";

function profile(overrides: Partial<DonorProfile> = {}): DonorProfile {
  return {
    userId: "00000000-0000-4000-8000-000000000001",
    displayName: null,
    locale: "es",
    defaultAnonymous: true,
    approvalStatus: "pending",
    portraitPath: null,
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
  it("una cuenta pendiente ya puede anotarse a traer: confirmar el correo alcanza", () => {
    expect(canReserve(profile())).toBe(true);
    expect(canReserve(profile({ approvalStatus: "declined" }))).toBe(false);
  });

  it("una cuenta rechazada no reserva; habilitada sí", () => {
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

describe("portraitPathFor", () => {
  const quien = "00000000-0000-4000-8000-000000000001";
  const otra = "00000000-0000-4000-8000-000000000002";

  it("la ruta es la carpeta de la persona, no el nombre original del archivo", () => {
    expect(portraitPathFor(quien, "image/jpeg")).toBe(`${quien}/retrato.jpg`);
    expect(portraitPathFor(quien, "image/png")).toBe(`${quien}/retrato.png`);
    expect(portraitPathFor(quien, "image/webp")).toBe(`${quien}/retrato.webp`);
  });

  it("una ruta ajena no es el retrato propio", () => {
    expect(isOwnPortraitPath(quien, portraitPathFor(otra, "image/jpeg"))).toBe(false);
    expect(isOwnPortraitPath(quien, `${quien}/otra-cosa.jpg`)).toBe(false);
    expect(isOwnPortraitPath(quien, null)).toBe(false);
  });

  it("la foto no publica a nadie: canAppearNamed no la mira", () => {
    expect(
      canAppearNamed(
        profile({
          portraitPath: portraitPathFor(quien, "image/jpeg"),
          defaultAnonymous: true,
        }),
      ),
    ).toBe(false);
  });
});
