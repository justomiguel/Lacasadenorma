import { describe, expect, it } from "vitest";

import { parseDonateIntent, serializeDonateIntent } from "./donate-intent";

const INTENT = {
  itemId: "ab700000-0000-4000-8000-000000000003",
  name: "Ana",
  email: "ana@ejemplo.invalid",
};

describe("donate-intent", () => {
  it("redondea un aviso de mail sin perder el ítem", () => {
    expect(parseDonateIntent(serializeDonateIntent(INTENT))).toEqual(INTENT);
  });

  it("descarta un payload que no es de este sitio", () => {
    expect(parseDonateIntent("https://otro.example")).toBeNull();
    expect(
      parseDonateIntent('{"itemId":"no-es-uuid","name":"Ana","email":"a@b.c"}'),
    ).toBeNull();
    expect(parseDonateIntent(undefined)).toBeNull();
  });
});
