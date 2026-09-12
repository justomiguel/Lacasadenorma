import { describe, expect, it } from "vitest";

import { fill } from "./fill";

describe("fill", () => {
  it("sustituye los huecos nombrados", () => {
    expect(fill("Se copió {label}.", { label: "CBU" })).toBe("Se copió CBU.");
  });

  it("deja visible un hueco que no se rellenó", () => {
    expect(fill("Al {date}.", {})).toBe("Al {date}.");
  });
});
