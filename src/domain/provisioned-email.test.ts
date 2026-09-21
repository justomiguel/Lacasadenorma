import { describe, expect, it } from "vitest";

import { inventedEmail, localPartFromName } from "./provisioned-email";

describe("localPartFromName", () => {
  it("pliega tildes y espacios", () => {
    expect(localPartFromName("María Pérez")).toBe("maria.perez");
  });

  it("si no queda nada, alguien", () => {
    expect(localPartFromName("…")).toBe("alguien");
    expect(localPartFromName("   ")).toBe("alguien");
  });
});

describe("inventedEmail", () => {
  it("usa @lacasadenorma.com", () => {
    expect(inventedEmail("María Pérez")).toBe("maria.perez@lacasadenorma.com");
  });

  it("si está tomado, suma -2", () => {
    expect(inventedEmail("María Pérez", new Set(["maria.perez@lacasadenorma.com"]))).toBe(
      "maria.perez-2@lacasadenorma.com",
    );
  });
});
