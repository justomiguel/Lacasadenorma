import { describe, expect, it } from "vitest";

import {
  oauthFailurePath,
  oauthSuccessPath,
  pathAfterEmailConfirm,
} from "./oauth-result";

describe("oauthSuccessPath", () => {
  it("sin destino vuelve a la cuenta, en el idioma de la pantalla", () => {
    expect(oauthSuccessPath("es", undefined)).toBe("/cuenta");
    expect(oauthSuccessPath("en", undefined)).toBe("/en/cuenta");
  });

  it("acepta el catálogo y rechaza un origen o una ruta ajena", () => {
    expect(oauthSuccessPath("es", "/catalogo")).toBe("/catalogo");
    expect(oauthSuccessPath("es", "https://otro.example/cuenta")).toBe("/cuenta");
    expect(oauthSuccessPath("es", "/admin")).toBe("/cuenta");
  });
});

describe("pathAfterEmailConfirm", () => {
  it("recuperar va a la contraseña; confirmar vuelve al catálogo si venía de ahí", () => {
    expect(pathAfterEmailConfirm("recovery", "es", "/catalogo")).toBe("/cuenta/clave");
    expect(
      pathAfterEmailConfirm(
        "signup",
        "es",
        "/catalogo/ab700000-0000-4000-8000-000000000003",
      ),
    ).toBe("/catalogo/ab700000-0000-4000-8000-000000000003");
    expect(pathAfterEmailConfirm("signup", "en", undefined)).toBe("/en/cuenta");
  });
});

describe("oauthFailurePath", () => {
  it("el aviso es un código nuestro, no el texto que mandó el proveedor", () => {
    expect(oauthFailurePath("es", "oauthFailed")).toBe(
      "/cuenta/ingresar?aviso=oauthFailed",
    );
    expect(oauthFailurePath("en", "oauthNoEmail")).toBe(
      "/en/cuenta/ingresar?aviso=oauthNoEmail",
    );
  });
});
