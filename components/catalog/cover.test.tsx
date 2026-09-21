import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content";
import { money } from "@/src/domain/money";

import { HowToDonate } from "./cover";
import type { ChromeSession } from "@/components/site/session";

const { mockDeSesion } = vi.hoisted(() => ({
  mockDeSesion: vi.fn(
    (): { session: ChromeSession; portraitSrc: string | null; refresh: () => void } => ({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    }),
  ),
}));

vi.mock("@/app/(es)/catalogo/actions", () => ({
  claimItemAction: vi.fn(async () => ({ status: "idle" })),
  startDonateAction: vi.fn(async () => ({ status: "idle" })),
}));

vi.mock("@/src/infrastructure/analytics/browser", () => ({
  track: vi.fn(),
}));

vi.mock("@/components/site/session", () => ({
  useChromeSession: mockDeSesion,
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
  it("el HTML público pide nombre y teléfono o correo, no dirección", () => {
    mockDeSesion.mockReturnValue({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    });

    renderDonate();

    expect(screen.queryByRole("heading", { name: /cómo donar esto/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/traer el mismo bien o cubrirlo con plata/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /traer el mismo bien/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /cubrir con plata/i })).not.toBeChecked();
    expect(document.querySelector('[data-path-mark="bring"]')).not.toBeNull();
    expect(document.querySelector('[data-path-mark="money"]')).not.toBeNull();
    expect(
      screen.getByRole("radio", { name: /^transferencia$/i }).closest("[data-money]"),
    ).not.toBeNull();
    expect(
      screen.getByRole("radio", { name: /mercado pago/i }).closest("[data-money]"),
    ).not.toBeNull();
    expect(screen.queryByLabelText(/sumar más/i)).not.toBeInTheDocument();
    const nombre = screen.getByLabelText(/^nombre$/i);
    const enviar = screen.getByRole("button", { name: /quiero donar/i });

    expect(nombre.compareDocumentPosition(enviar) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(nombre).toBeRequired();
    expect(screen.getByLabelText(/^teléfono$/i)).not.toBeRequired();
    expect(screen.getByLabelText(/^correo$/i)).not.toBeRequired();
    expect(
      screen.queryByLabelText(/dirección donde ir a buscar/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/teléfono o un correo/i)).toBeInTheDocument();
  });

  it("con sesión hidratada reserva con un clic, sin nombre ni dirección", () => {
    mockDeSesion.mockReturnValue({
      session: {
        status: "signed-in",
        displayName: "Ana",
        email: "ana@ejemplo.invalid",
        hasPortrait: false,
        staff: false,
        owner: false,
      },
      portraitSrc: null,
      refresh: () => undefined,
    });

    renderDonate();

    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^teléfono$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^correo$/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/dirección donde ir a buscar/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/quiero aparecer con nombre/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre para mostrar/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/nota para la familia/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quiero donar/i })).toBeInTheDocument();
    expect(screen.getByText(/un clic reserva/i)).toBeInTheDocument();
  });

  it("al elegir transferencia no muestra el recargo de Mercado Pago", async () => {
    mockDeSesion.mockReturnValue({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    });

    const user = userEvent.setup();

    renderDonate();

    await user.click(screen.getByRole("radio", { name: /cubrir con plata/i }));
    await user.click(screen.getByRole("radio", { name: /^transferencia$/i }));

    expect(screen.queryByLabelText(/sumar más/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/el sugerido es/i)).not.toBeInTheDocument();
    expect(screen.getByText(/por transferencia o paypal/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /quiero donar/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/no hace falta cuenta ni anotarse/i)).not.toBeInTheDocument();
  });

  it("al elegir Mercado Pago muestra el extra y no el texto de transferencia", async () => {
    mockDeSesion.mockReturnValue({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    });

    const user = userEvent.setup();

    renderDonate();

    await user.click(screen.getByRole("radio", { name: /cubrir con plata/i }));
    await user.click(screen.getByRole("radio", { name: /mercado pago/i }));

    expect(screen.getByLabelText(/sumar más/i)).toBeInTheDocument();
    expect(screen.getByText(/por mercado pago el sugerido/i)).toBeInTheDocument();
    expect(screen.queryByText(/por transferencia o paypal/i)).not.toBeInTheDocument();
  });
});
