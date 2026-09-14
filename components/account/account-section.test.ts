import { describe, expect, it } from "vitest";

import { resolveAccountSection } from "./account-section";

describe("resolveAccountSection", () => {
  it("respeta una sección pedida, y si no hay pedido abre reservas cuando hay", () => {
    expect(resolveAccountSection("acceso", false)).toBe("acceso");
    expect(resolveAccountSection("inventada", true)).toBe("reservas");
    expect(resolveAccountSection(null, true)).toBe("reservas");
    expect(resolveAccountSection(null, false)).toBe("aparecer");
  });
});
