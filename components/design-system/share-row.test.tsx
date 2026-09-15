import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ShareRow } from "./share-row";

const URL = "https://ejemplo.test/obra";

function conPortapapeles(): {
  user: ReturnType<typeof userEvent.setup>;
  writeText: ReturnType<typeof vi.fn>;
} {
  const user = userEvent.setup();
  const writeText = vi.fn(() => Promise.resolve());

  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });

  return { user, writeText };
}

function sinPortapapeles(): ReturnType<typeof userEvent.setup> {
  const user = userEvent.setup();

  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
  });

  return user;
}

describe("ShareRow", { timeout: 15_000 }, () => {
  it("copia el enlace y confirma en el botón y en la región viva", async () => {
    const { user, writeText } = conPortapapeles();

    const { container } = render(<ShareRow url={URL} title="Obra" text="La obra" />);

    await user.click(screen.getByRole("button", { name: /copiar enlace/i }));

    expect(writeText).toHaveBeenCalledWith(URL);
    expect(screen.getByRole("button", { name: /enlace copiado/i })).toBeInTheDocument();
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Se copió el enlace de la página.",
    );
  });

  it("si el navegador niega el portapapeles, el fallo se ve y el enlace queda a la vista", async () => {
    const user = sinPortapapeles();

    render(<ShareRow url={URL} title="Obra" text="La obra" />);

    await user.click(screen.getByRole("button", { name: /copiar enlace/i }));

    expect(screen.getByText(/no pudimos copiar el enlace/i)).toBeInTheDocument();
    expect(screen.getByText(URL)).toBeInTheDocument();
  });
});
