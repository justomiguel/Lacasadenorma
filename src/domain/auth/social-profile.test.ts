import { describe, expect, it } from "vitest";

import { isTrustedAvatarUrl, socialHintsFromIdentities } from "./social-profile";

describe("socialHintsFromIdentities", () => {
  it("sin identidades o sólo correo no hay propuesta de perfil", () => {
    expect(socialHintsFromIdentities(undefined)).toBeNull();
    expect(socialHintsFromIdentities([])).toBeNull();
    expect(
      socialHintsFromIdentities([{ provider: "email", identity_data: { name: "No" } }]),
    ).toBeNull();
  });

  it("toma el nombre de Google y no el local-part del correo", () => {
    expect(
      socialHintsFromIdentities([
        {
          provider: "google",
          identity_data: {
            email: "juanperez@gmail.com",
            full_name: "  Juan Pérez  ",
            picture: "https://lh3.googleusercontent.com/a/foto",
          },
        },
      ]),
    ).toEqual({
      displayName: "Juan Pérez",
      avatarUrl: "https://lh3.googleusercontent.com/a/foto",
    });
  });

  it("un avatar que no es de la red no se baja", () => {
    expect(
      socialHintsFromIdentities([
        {
          provider: "google",
          identity_data: {
            name: "Vecina",
            picture: "http://127.0.0.1/ssrf",
          },
        },
      ]),
    ).toEqual({ displayName: "Vecina", avatarUrl: null });
  });

  it("traduce twitter al catálogo y usa avatar_url si no hay picture", () => {
    expect(
      socialHintsFromIdentities([
        {
          provider: "twitter",
          identity_data: {
            name: "Quien está en X",
            avatar_url: "https://pbs.twimg.com/profile.jpg",
          },
        },
      ]),
    ).toEqual({
      displayName: "Quien está en X",
      avatarUrl: "https://pbs.twimg.com/profile.jpg",
    });
  });
});

describe("isTrustedAvatarUrl", () => {
  it("acepta HTTPS de los CDN de las redes del catálogo", () => {
    expect(isTrustedAvatarUrl("https://lh3.googleusercontent.com/a/x")).toBe(true);
    expect(isTrustedAvatarUrl("https://avatars.githubusercontent.com/u/1")).toBe(true);
  });

  it("rechaza http, IPs, localhost y un host que no es de la red", () => {
    expect(isTrustedAvatarUrl("http://lh3.googleusercontent.com/a/x")).toBe(false);
    expect(isTrustedAvatarUrl("https://127.0.0.1/x")).toBe(false);
    expect(isTrustedAvatarUrl("https://localhost/x")).toBe(false);
    expect(isTrustedAvatarUrl("https://evil.example/x")).toBe(false);
    expect(isTrustedAvatarUrl("not-a-url")).toBe(false);
  });
});
