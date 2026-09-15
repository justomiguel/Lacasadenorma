import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content";
import { money } from "@/src/domain/money";

import { HowToDonate } from "./cover";

vi.mock("@/app/(es)/catalogo/actions", () => ({
  claimItemAction: vi.fn(async () => ({ status: "idle" })),
}));

vi.mock("@/src/infrastructure/analytics/browser", () => ({
  track: vi.fn(),
}));

const { catalog, account, help, ui } = getContent("es");

function renderDonate() {
  return render(
    <HowToDonate
      itemId="item-tina"
      remaining={1}
      estimated={money(10_000, "ARS")}
      copy={catalog}
      account={account}
      help={help}
      ui={ui}
      locale="es"
    />,
  );
}

describe("HowToDonate", () => {
  it("explica que se puede traer el bien o cubrirlo con plata, y arranca en traer el mismo bien", () => {
    renderDonate();

    expect(screen.getByRole("heading", { name: /cómo donar esto/i })).toBeInTheDocument();
    expect(
      screen.getByText(/traer el mismo bien o cubrirlo con plata/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /traer el mismo bien/i })).toBeChecked();
    expect(screen.queryByLabelText(/sumar más/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quiero donar/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^nombre$/i)).toBeRequired();
    expect(screen.getByLabelText(/dirección donde ir a buscar/i)).toBeRequired();
    expect(screen.getByLabelText(/^teléfono$/i)).not.toBeRequired();
    expect(screen.getByText(/confirmar el correo no es una prueba/i)).toBeInTheDocument();
  });

  it("al elegir transferencia no muestra el recargo de Mercado Pago", async () => {
    const user = userEvent.setup();

    renderDonate();

    await user.click(screen.getByRole("radio", { name: /^transferencia$/i }));

    expect(screen.queryByLabelText(/sumar más/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/el sugerido es/i)).not.toBeInTheDocument();
    expect(screen.getByText(/por transferencia o paypal/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /quiero donar/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/no hace falta cuenta ni anotarse/i)).toBeInTheDocument();
  });

  it("al elegir Mercado Pago muestra el extra y no el texto de transferencia", async () => {
    const user = userEvent.setup();

    renderDonate();

    await user.click(screen.getByRole("radio", { name: /mercado pago/i }));

    expect(screen.getByLabelText(/sumar más/i)).toBeInTheDocument();
    expect(screen.getByText(/por mercado pago el sugerido/i)).toBeInTheDocument();
    expect(screen.queryByText(/por transferencia o paypal/i)).not.toBeInTheDocument();
  });
});
