import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatMoney, money } from "@/src/domain/money";

import { ProgressBar } from "./figures";

/**
 * La barra de progreso es donde una omisión honesta se convierte en mentira con
 * más facilidad: una barra al 0% comunica "no juntamos nada", que es una cosa, y
 * lo que en realidad pasa es que "el objetivo todavía no está publicado", que es
 * otra. El componente no dibuja la barra en ese caso, y estos tests existen para
 * que nadie la "arregle" agregándole un cero por defecto.
 */

const RECAUDADO = money(24_000_000, "ARS");
const OBJETIVO = money(100_000_000, "ARS");

describe("ProgressBar sin objetivo publicado", () => {
  it("sin objetivo no dibuja barra ni muestra ningún porcentaje", () => {
    const { container } = render(
      <ProgressBar raised={RECAUDADO} goal={null} percent={null} />,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    // Ni el símbolo: un "0%" en pantalla es una cifra falsa, y una cifra falsa en
    // una campaña de dinero es lo único que la constitución prohíbe sin matices.
    expect(container.textContent).not.toContain("%");
    expect(container.textContent).not.toMatch(/\d\s*%/);
  });

  it("sin objetivo igual muestra lo recaudado y explica por qué falta el resto", () => {
    const { container } = render(
      <ProgressBar raised={RECAUDADO} goal={null} percent={null} />,
    );

    // Omitir la barra no es omitir el dato: lo recaudado sí está verificado y se
    // publica, con la explicación de qué falta (estado vacío diseñado).
    expect(screen.getByText(formatMoney(RECAUDADO))).toBeInTheDocument();
    expect(container.textContent).toMatch(/objetivo todav[ií]a no est[aá] publicado/i);
  });

  it("un porcentaje nulo con objetivo cargado tampoco dibuja la barra", () => {
    // Puede pasar: el objetivo existe pero el cálculo devolvió `null` porque el
    // denominador es cero. Dibujar la barra ahí requeriría inventar el número.
    const { container } = render(
      <ProgressBar raised={RECAUDADO} goal={OBJETIVO} percent={null} />,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("%");
  });
});

describe("ProgressBar con objetivo publicado", () => {
  it("expone el porcentaje en el rango que espera la tecnología asistiva", () => {
    render(<ProgressBar raised={RECAUDADO} goal={OBJETIVO} percent={24} />);

    const barra = screen.getByRole("progressbar");

    expect(barra).toHaveAttribute("aria-valuenow", "24");
    expect(barra).toHaveAttribute("aria-valuemin", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "100");
  });

  it("el nombre accesible nombra los dos montos, no sólo el porcentaje", () => {
    render(<ProgressBar raised={RECAUDADO} goal={OBJETIVO} percent={24} />);

    // "24 por ciento" sin los montos no dice nada: quien escucha la página
    // necesita saber 24% de cuánto, igual que quien la ve.
    const nombre = screen.getByRole("progressbar").getAttribute("aria-label") ?? "";

    expect(nombre).toContain(formatMoney(RECAUDADO));
    expect(nombre).toContain(formatMoney(OBJETIVO));
  });

  it("redondea el valor anunciado a un entero", () => {
    render(<ProgressBar raised={RECAUDADO} goal={OBJETIVO} percent={24.6} />);

    // `aria-valuenow="24.6"` es válido, pero se lee peor y no aporta precisión
    // real sobre una cifra que se concilia una vez por mes.
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  });
});
