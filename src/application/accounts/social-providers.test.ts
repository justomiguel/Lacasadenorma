import { describe, expect, it } from "vitest";

import { enabledSocialProviders, unknownSocialProviders } from "./social-providers";

describe("enabledSocialProviders", () => {
  it("sin variable no hay botones", () => {
    expect(enabledSocialProviders(undefined)).toEqual([]);
    expect(enabledSocialProviders("")).toEqual([]);
  });

  it("habilita sólo lo que está en el catálogo, en el orden pedido", () => {
    expect(enabledSocialProviders("google, apple, keycloak")).toEqual([
      "google",
      "apple",
    ]);
    expect(unknownSocialProviders("google, apple, keycloak")).toEqual(["keycloak"]);
  });
});
