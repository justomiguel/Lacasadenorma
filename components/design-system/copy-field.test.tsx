import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CopyField } from "./copy-field";

/**
 * `CopyField` es el último paso antes de que alguien transfiera plata, así que lo
 * que se prueba acá no es que el botón "funcione": es que lo que termina en el
 * portapapeles sea **exactamente** el dato verificado, que la confirmación se
 * anuncie a quien no la puede ver, y que todo el recorrido se pueda hacer sin
 * mouse. Un dígito agregado por un formateo "lindo" manda el dinero a otra parte.
 */

const CBU = "0000003100010000000001";

/**
 * `userEvent.setup()` instala su propio portapapeles falso, así que el nuestro se
 * define después: si no, el componente escribiría en el de la librería y no
 * podríamos ver con qué lo llamaron.
 */
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

describe("CopyField", { timeout: 15_000 }, () => {
  it("copia el valor exacto, sin espacios ni formato agregado", async () => {
    const { user, writeText } = conPortapapeles();

    render(<CopyField label="CBU" value={CBU} />);

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    // `toBe` y no `toContain`: un CBU con un espacio de más lo rechaza el banco, y
    // uno con un dígito cambiado transfiere a la cuenta de otra persona.
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toBe(CBU);
  });

  it("anuncia la confirmación en una región viva que ya estaba en el documento", async () => {
    const { user } = conPortapapeles();

    const { container } = render(<CopyField label="CBU" value={CBU} />);
    const live = container.querySelector('[aria-live="polite"]');

    // Si la región apareciera junto con el mensaje, algunos lectores de pantalla
    // no lo anunciarían nunca: quien no ve el cambio de texto no se enteraría de
    // que el dato ya está copiado.
    expect(live).not.toBeNull();
    expect(live).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    expect(live).toHaveTextContent("Se copió CBU.");
    expect(await screen.findByRole("button", { name: /copiado/i })).toBeInTheDocument();
  });

  it("se completa entero con el teclado, sin tocar el mouse", async () => {
    const { user, writeText } = conPortapapeles();
    const onCopied = vi.fn();

    render(<CopyField label="Alias" value="casa.de.norma" onCopied={onCopied} />);

    await user.tab();

    // Es un `<button>` de verdad, así que entra en el orden de tabulación y
    // responde a Enter sin código extra. El flujo 5 de E2E corre sólo con teclado.
    expect(screen.getByRole("button", { name: /copiar/i })).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(writeText).toHaveBeenCalledWith("casa.de.norma");
    expect(onCopied).toHaveBeenCalledTimes(1);
  });

  it("el valor queda visible y seleccionable aunque el navegador niegue el portapapeles", async () => {
    const user = sinPortapapeles();

    const { container } = render(<CopyField label="CBU" value={CBU} />);

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    // Un botón que no hace nada es peor que no tener botón: el fallo se ve, se
    // explica qué hacer y el dato sigue a la vista para copiarlo a mano.
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
      /no pudimos copiar cbu autom[aá]ticamente/i,
    );
    expect(screen.getByText(CBU)).toBeInTheDocument();
  });

  it("un campo que no se copia no publica una región viva vacía", () => {
    const { container } = render(
      <CopyField label="Titular" value="Justo Miguel Vargas" copyable={false} />,
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("no le pasa el valor copiado a la analítica", async () => {
    const { user } = conPortapapeles();
    const onCopied = vi.fn();

    render(<CopyField label="CBU" value={CBU} onCopied={onCopied} />);

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    // Registrar "se copió un CBU" es una métrica; registrar cuál, es publicar un
    // dato bancario en un servicio de terceros.
    expect(onCopied).toHaveBeenCalledWith();
  });
});
