import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChosenFile } from "./chosen-file";

describe("ChosenFile", () => {
  it("una imagen elegida se ve de inmediato, y al subir late el estado de carga", () => {
    const file = new File(["foto"], "obra.jpg", { type: "image/jpeg" });

    const { rerender } = render(<ChosenFile file={file} />);

    expect(screen.getByRole("img", { name: "obra.jpg" })).toHaveAttribute(
      "src",
      expect.stringMatching(/^blob:/),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(<ChosenFile file={file} pending pendingLabel="Subiendo la foto…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Subiendo la foto…");
    expect(screen.getByRole("img", { name: "obra.jpg" })).toHaveAttribute(
      "data-busy-preview",
      "",
    );
  });

  it("un archivo que no es imagen se nombra, sin inventar una previa", () => {
    const file = new File(["pdf"], "factura.pdf", { type: "application/pdf" });

    render(<ChosenFile file={file} />);

    expect(screen.getByText("factura.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
