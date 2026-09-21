import { describe, expect, it } from "vitest";

import { isAccountSettingsSection, resolveAccountSection } from "./account-section";

describe("resolveAccountSection", () => {
  it("respeta una sección pedida, y si no hay pedido abre reservas cuando hay", () => {
    expect(resolveAccountSection("acceso", false)).toBe("acceso");
    expect(resolveAccountSection("cuenta", true)).toBe("cuenta");
    expect(resolveAccountSection("inventada", true)).toBe("reservas");
    expect(resolveAccountSection(null, true)).toBe("reservas");
    expect(resolveAccountSection(null, false)).toBe("cuenta");
  });

  it("cuenta, aparecer, acceso y borrar son la misma página", () => {
    expect(isAccountSettingsSection("cuenta")).toBe(true);
    expect(isAccountSettingsSection("aparecer")).toBe(true);
    expect(isAccountSettingsSection("acceso")).toBe(true);
    expect(isAccountSettingsSection("borrar")).toBe(true);
    expect(isAccountSettingsSection("reservas")).toBe(false);
  });
});
