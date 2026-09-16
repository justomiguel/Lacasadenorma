import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BankIcon } from "./icons";
import { IdentifyingMark } from "./identifying-mark";

describe("IdentifyingMark", () => {
  it("va antes del nombre y mide en em de esa letra", () => {
    const { container } = render(
      <p className="text-body">
        <IdentifyingMark data-field-mark="CBU">
          <BankIcon />
        </IdentifyingMark>
        CBU
      </p>,
    );

    const mark = container.querySelector("[data-field-mark=CBU]");

    expect(mark).not.toBeNull();
    expect(mark?.className).toMatch(/identifying-mark/);
    expect(mark?.nextSibling?.textContent).toBe("CBU");
    expect(mark?.querySelector("svg")).not.toBeNull();
  });
});
