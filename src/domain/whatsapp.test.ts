import { describe, expect, it } from "vitest";

import { whatsappHrefFor } from "./whatsapp";

describe("whatsappHrefFor", () => {
  it("un celular de Buenos Aires de diez dígitos lleva 549", () => {
    expect(whatsappHrefFor("11 1234-5678")).toBe("https://wa.me/5491112345678");
  });

  it("un +54 9 ya viene listo para wa.me", () => {
    expect(whatsappHrefFor("+54 9 11 1234 5678")).toBe("https://wa.me/5491112345678");
  });

  it("un +54 sin el 9 de móvil lo agrega", () => {
    expect(whatsappHrefFor("+54 11 1234-5678")).toBe("https://wa.me/5491112345678");
  });

  it("un 0 de trunk no viaja", () => {
    expect(whatsappHrefFor("011 1234-5678")).toBe("https://wa.me/5491112345678");
  });

  it("un número de Formosa de diez dígitos también lleva 549", () => {
    expect(whatsappHrefFor("3704 000000")).toBe("https://wa.me/5493704000000");
  });

  it("sin dígitos de más no inventa un enlace", () => {
    expect(whatsappHrefFor("123")).toBeNull();
    expect(whatsappHrefFor("   ")).toBeNull();
  });
});
