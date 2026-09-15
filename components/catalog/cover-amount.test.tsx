import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { getContent } from "@/content";
import { money } from "@/src/domain/money";

import { CoverAmounts } from "./cover-amount";

const copy = getContent("es").catalog;

function Harness({ extra: initial = "" }: { extra?: string }) {
  const [extra, setExtra] = useState(initial);

  return (
    <CoverAmounts
      unit={money(10_000, "ARS")}
      quantity={1}
      extra={extra}
      onExtraChange={setExtra}
      copy={copy}
      locale="es"
    />
  );
}

describe("CoverAmounts", () => {
  it("dice que el monto es estimado, no fijo, y suma el 10% de Mercado Pago", () => {
    render(<Harness />);

    expect(screen.getAllByText(/estimado, no (un )?precio fijo/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/\$ 110/).length).toBeGreaterThan(0);
  });

  it("permite sumar más arriba del sugerido de Mercado Pago", async () => {
    const user = userEvent.setup();

    render(<Harness />);

    await user.type(screen.getByLabelText(/sumar más/i), "50");

    expect(screen.getByText(/\$ 160/)).toBeInTheDocument();
  });
});
