import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareRow } from "./share-row";

const URL = "https://ejemplo.test/obra";

/**
 * El HTML servido y el primer render del cliente tienen que coincidir. Si
 * `navigator.share` se lee durante el render, el servidor manda la lista y el
 * teléfono hidrata un botón: React tira el árbol y lo rehace.
 */
function conShareNativo(): ReturnType<typeof vi.fn> {
  const share = vi.fn(() => Promise.resolve());

  Object.defineProperty(navigator, "share", {
    value: share,
    configurable: true,
  });

  return share;
}

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

afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
});

describe("ShareRow sin JavaScript", () => {
  it("el HTML servido trae los enlaces y no el botón nativo, aunque el entorno tenga share", () => {
    conShareNativo();

    const html = renderToStaticMarkup(<ShareRow url={URL} title="Obra" text="La obra" />);

    expect(html).toContain("WhatsApp");
    expect(html).toContain("Copiar enlace");
    expect(html).not.toMatch(/<button[^>]*>Compartir<\/button>/);
  });
});

describe("ShareRow", { timeout: 15_000 }, () => {
  it("después de hidratar, si el navegador tiene share, aparece el botón nativo", async () => {
    const share = conShareNativo();

    render(<ShareRow url={URL} title="Obra" text="La obra" />);

    await userEvent.click(screen.getByRole("button", { name: "Compartir" }));

    expect(share).toHaveBeenCalledWith({
      title: "Obra",
      text: "La obra",
      url: URL,
    });
  });

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
