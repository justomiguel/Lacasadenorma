import { describe, expect, it } from "vitest";

import { enabledSocialProviders, unknownSocialProviders } from "./social-providers";

describe("enabledSocialProviders", () => {
  it("sin variable no hay botones", () => {
    const previous = process.env.AUTH_SOCIAL_PROVIDERS;
    delete process.env.AUTH_SOCIAL_PROVIDERS;
    try {
      expect(enabledSocialProviders(undefined)).toEqual([]);
      expect(enabledSocialProviders("")).toEqual([]);
    } finally {
      if (previous === undefined) {
        delete process.env.AUTH_SOCIAL_PROVIDERS;
      } else {
        process.env.AUTH_SOCIAL_PROVIDERS = previous;
      }
    }
  });

  it("habilita sólo lo que está en el catálogo, en el orden pedido", () => {
    expect(enabledSocialProviders("google, apple, keycloak")).toEqual([
      "google",
      "apple",
    ]);
    expect(unknownSocialProviders("google, apple, keycloak")).toEqual(["keycloak"]);
  });
});
