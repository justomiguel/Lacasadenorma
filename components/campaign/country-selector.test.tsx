import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountrySelector } from "./country-selector";

const names = {
  AR: "Argentina",
  CL: "Chile",
  INT: "Internacional",
};

describe("CountrySelector", () => {
  it("cada tab lleva bandera o globo al lado del nombre", () => {
    const { container } = render(
      <CountrySelector
        region="AR"
        names={names}
        label="Donar"
        baseId="paises"
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole("tab", { name: "Argentina" })).toBeInTheDocument();
    expect(container.querySelector("[data-flag=AR]")).not.toBeNull();
    expect(container.querySelector("[data-flag=CL]")).not.toBeNull();
    expect(container.querySelector("[data-country-mark=INT]")).not.toBeNull();
    expect(container.querySelector("[data-country-mark=INT]")?.className).toMatch(
      /identifying-mark/,
    );
  });
});
