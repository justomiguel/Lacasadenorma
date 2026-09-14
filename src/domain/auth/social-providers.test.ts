import { describe, expect, it } from "vitest";

import {
  parseSocialProviders,
  SOCIAL_PROVIDER_IDS,
  supabaseProviderOf,
} from "./social-providers";

/**
 * El catálogo cerrado de redes con las que se puede crear una cuenta.
 *
 * Lo que se afirma acá no es la lista: es que **un nombre que no está no se
 * convierte en un botón**. AUTH_SOCIAL_PROVIDERS es texto de entorno, llega
 * sucio, y un typo o un IdP de empresa (Azure, Keycloak, WorkOS) no puede
 * aparecer en `/cuenta/crear` como si fuera una red social nativa.
 */

describe("parseSocialProviders", () => {
  it("sin valor no hay proveedores: el botón no se inventa", () => {
    expect(parseSocialProviders(undefined)).toEqual({ providers: [], unknown: [] });
    expect(parseSocialProviders("")).toEqual({ providers: [], unknown: [] });
    expect(parseSocialProviders("   ")).toEqual({ providers: [], unknown: [] });
  });

  it("acepta la lista separada por comas, recorta y no distingue mayúsculas", () => {
    expect(parseSocialProviders("google, apple")).toEqual({
      providers: ["google", "apple"],
      unknown: [],
    });
    expect(parseSocialProviders("GOOGLE")).toEqual({
      providers: ["google"],
      unknown: [],
    });
  });

  it("conserva el orden y tira el duplicado", () => {
    expect(parseSocialProviders("apple,google,apple")).toEqual({
      providers: ["apple", "google"],
      unknown: [],
    });
  });

  it("traduce los alias que Supabase usa y la marca no", () => {
    expect(parseSocialProviders("twitter,linkedin_oidc")).toEqual({
      providers: ["x", "linkedin"],
      unknown: [],
    });
  });

  it("un nombre que no está en el catálogo no se habilita: se reporta", () => {
    expect(parseSocialProviders("google, keycloak, azure, workos")).toEqual({
      providers: ["google"],
      unknown: ["keycloak", "azure", "workos"],
    });
  });

  it("Instagram no es login nativo de Supabase y no entra", () => {
    expect(parseSocialProviders("instagram")).toEqual({
      providers: [],
      unknown: ["instagram"],
    });
  });
});

describe("el catálogo habla el idioma de GoTrue", () => {
  it("cada id del catálogo tiene un provider nativo de Auth", () => {
    expect(SOCIAL_PROVIDER_IDS).toEqual([
      "google",
      "apple",
      "facebook",
      "x",
      "github",
      "gitlab",
      "linkedin",
      "discord",
      "twitch",
      "spotify",
    ]);
  });

  it("LinkedIn usa OIDC y X sigue yendo como twitter al API", () => {
    expect(supabaseProviderOf("linkedin")).toBe("linkedin_oidc");
    expect(supabaseProviderOf("x")).toBe("twitter");
    expect(supabaseProviderOf("google")).toBe("google");
  });
});
