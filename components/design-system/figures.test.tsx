import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "./figures";

/**
 * La barra pública mide lo usado sobre lo que ya llegó. El 100% de la obra no
 * está publicado: estos tests existen para que nadie "arregle" eso dibujando
 * una barra al 0% o un monto.
 */

describe("ProgressBar sin total conocido", () => {
  it("sin recibido no dibuja barra ni un porcentaje de avance", () => {
    const { container } = render(
      <ProgressBar spentPercent={null} remainingPercent={null} />,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\$/);
  });

  it("explica que el 100% de la obra no está publicado", () => {
    const { container } = render(
      <ProgressBar spentPercent={null} remainingPercent={null} />,
    );

    expect(container.textContent).toMatch(/100\s*%/);
    expect(container.textContent).toMatch(/todav[ií]a no est[aá] publicado/i);
  });
});

describe("ProgressBar con lo recibido conocido", () => {
  it("expone el porcentaje usado en el rango que espera la tecnología asistiva", () => {
    render(<ProgressBar spentPercent={42} remainingPercent={58} />);

    const barra = screen.getByRole("progressbar");

    expect(barra).toHaveAttribute("aria-valuenow", "42");
    expect(barra).toHaveAttribute("aria-valuemin", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "100");
  });

  it("el nombre accesible dice de qué total es el porcentaje, sin montos", () => {
    render(<ProgressBar spentPercent={42} remainingPercent={58} />);

    const nombre = screen.getByRole("progressbar").getAttribute("aria-label") ?? "";

    expect(nombre).toMatch(/42\s*%/);
    expect(nombre).toMatch(/lleg[oó]/i);
    expect(nombre).not.toMatch(/\$/);
  });

  it("redondea el valor anunciado a un entero", () => {
    render(<ProgressBar spentPercent={24.6} remainingPercent={75.4} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  });

  it("no publica ningún símbolo de moneda", () => {
    const { container } = render(<ProgressBar spentPercent={40} remainingPercent={60} />);

    expect(container.textContent).not.toMatch(/\$/);
    expect(container.textContent).not.toMatch(/ARS|USD|CLP/);
  });
});
