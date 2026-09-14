import { beforeEach, describe, expect, it } from "vitest";

import {
  FakeAccountPort,
  FakeDonationsPort,
  FAKE_ACCOUNT_USER_ID,
  fakeAccountDeps,
  fakeProfile,
} from "./fake-account-port";
import { readOwnChrome, removeOwnPortrait, saveOwnPortrait } from "./own-portrait";

let port: FakeAccountPort;
let donations: FakeDonationsPort;

function deps(state: "ready" | "anonymous" | "not-configured" = "ready") {
  return fakeAccountDeps(port, donations, state);
}

beforeEach(() => {
  port = new FakeAccountPort();
  donations = new FakeDonationsPort();
});

describe("readOwnChrome", () => {
  it("no crea el perfil: abrir el menú no es pedir una cuenta", async () => {
    const result = await readOwnChrome(deps());

    expect(result).toEqual({
      status: "ok",
      value: { displayName: null, hasPortrait: false },
    });
    expect(port.ensureCalls).toBe(0);
    expect(port.profile).toBeNull();
  });

  it("si ya hay perfil, trae el nombre y si hay foto", async () => {
    port.profile = fakeProfile({
      displayName: "Vecina de la cuadra",
      portraitPath: `${FAKE_ACCOUNT_USER_ID}/retrato.jpg`,
    });

    const result = await readOwnChrome(deps());

    expect(result).toEqual({
      status: "ok",
      value: { displayName: "Vecina de la cuadra", hasPortrait: true },
    });
    expect(port.ensureCalls).toBe(0);
  });

  it("sin sesión no hay chrome propio", async () => {
    const result = await readOwnChrome(deps("anonymous"));

    expect(result).toEqual({ status: "error", code: "noSession", field: null });
  });
});

describe("saveOwnPortrait", () => {
  it("guarda la foto y no toca el nombre", async () => {
    port.profile = fakeProfile({ displayName: "Vecina de la cuadra" });
    const file = new File([new Uint8Array([1, 2, 3])], "yo.png", { type: "image/png" });

    const result = await saveOwnPortrait(deps(), file);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.value.portraitPath).toBe(`${FAKE_ACCOUNT_USER_ID}/retrato.png`);
    expect(result.value.displayName).toBe("Vecina de la cuadra");
  });

  it("un archivo que el puerto rechaza se traduce al código, no al detalle", async () => {
    port.failWith = Object.assign(new Error("El archivo está vacío."), {
      name: "UnsupportedFileError",
    });

    const result = await saveOwnPortrait(
      deps(),
      new File([], "vacio.png", { type: "image/png" }),
    );

    expect(result).toEqual({
      status: "error",
      code: "portraitInvalid",
      field: "portrait",
    });
  });

  it("sin sesión no sube nada", async () => {
    const result = await saveOwnPortrait(
      deps("anonymous"),
      new File([new Uint8Array([1])], "yo.png", { type: "image/png" }),
    );

    expect(result).toEqual({ status: "error", code: "noSession", field: null });
    expect(port.profile).toBeNull();
  });
});

describe("removeOwnPortrait", () => {
  it("deja el perfil y saca la foto", async () => {
    port.profile = fakeProfile({
      portraitPath: `${FAKE_ACCOUNT_USER_ID}/retrato.jpg`,
    });

    const result = await removeOwnPortrait(deps());

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.value.portraitPath).toBeNull();
  });
});
