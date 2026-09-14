import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BusyCue } from "./busy";

describe("BusyCue", () => {
  it("anuncia la espera con una región de estado, no con un spinner", () => {
    render(<BusyCue label="Subiendo la foto…" />);

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Subiendo la foto…");
    expect(status.querySelector("[data-busy-rule]")).not.toBeNull();
  });
});
