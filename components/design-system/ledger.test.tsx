import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ExpenseRecord } from "@/src/domain/entities";
import { money } from "@/src/domain/money";

import { Ledger } from "./ledger";

/**
 * El libro de gastos es el argumento de confianza del proyecto, y se lee tanto en
 * pantalla como con un lector de pantalla. Dos cosas se prueban acá: que la
 * estructura de tabla exista de verdad —encabezados asociados, no `div`s que se
 * parecen a una tabla—, y que la columna de comprobantes cumpla la promesa exacta
 * de FR-013: se publica **que** el comprobante existe, nunca **dónde** está.
 */

const CAPTION = "Cada gasto ejecutado, con su fecha y su comprobante.";

/**
 * Un gasto con la ruta del archivo pegada, como podría llegar de la base si
 * alguien cambiara el `select` de la consulta. El componente sólo recibe
 * `ExpenseRecord`, y esta forma existe para comprobar que la ruta no se filtra ni
 * cuando viene en los datos.
 */
interface ExpenseConRuta extends ExpenseRecord {
  readonly storagePath: string;
}

const RUTA_PRIVADA = "comprobantes/2026/09/chapas.pdf";

const conComprobantes: ExpenseConRuta = {
  id: "e1",
  amount: money(10_000_000, "ARS"),
  spentAt: "2026-09-02",
  concept: "Chapas para el techo",
  category: "materiales",
  supplier: "Corralón del pueblo",
  budgetItemId: null,
  receiptCount: 2,
  voidedAt: null,
  storagePath: RUTA_PRIVADA,
};

const sinComprobante: ExpenseRecord = {
  id: "e2",
  amount: money(500_000, "ARS"),
  spentAt: "2026-08-28",
  concept: "Flete",
  category: "transporte",
  supplier: null,
  budgetItemId: null,
  receiptCount: 0,
  voidedAt: null,
};

describe("Ledger", () => {
  it("es una tabla de verdad, con leyenda que le da nombre", () => {
    render(<Ledger expenses={[conComprobantes]} caption={CAPTION} />);

    const tabla = screen.getByRole("table");

    // La leyenda no es decoración: es lo que anuncia un lector de pantalla al
    // entrar a la tabla, y sin ella son cinco columnas sin contexto.
    expect(tabla).toHaveAccessibleName(CAPTION);
    expect(tabla.querySelector("caption")).not.toBeNull();
  });

  it("los encabezados de columna declaran scope='col'", () => {
    render(<Ledger expenses={[conComprobantes]} caption={CAPTION} />);

    const encabezados = screen.getAllByRole("columnheader");

    expect(encabezados.map((th) => th.textContent)).toEqual([
      "Fecha",
      "Concepto",
      "Categoría",
      "Comprobante",
      "Monto",
    ]);

    for (const th of encabezados) {
      expect(th).toHaveAttribute("scope", "col");
    }
  });

  it("el concepto es el encabezado de su fila, con scope='row'", () => {
    render(<Ledger expenses={[conComprobantes]} caption={CAPTION} />);

    const encabezadoDeFila = screen.getByRole("rowheader");

    // Con `scope="row"`, cada celda se anuncia como "Concepto: Chapas, Monto:
    // $100.000". Sin él, se anuncian cinco valores sueltos por fila.
    expect(encabezadoDeFila).toHaveAttribute("scope", "row");
    expect(encabezadoDeFila).toHaveTextContent("Chapas para el techo");
  });

  it("un gasto con comprobante avisa que existe y no publica ninguna ruta", () => {
    const { container } = render(
      <Ledger expenses={[conComprobantes]} caption={CAPTION} />,
    );

    expect(
      screen.getByText("Tiene 2 comprobantes en el archivo interno"),
    ).toBeInTheDocument();

    // La ruta del archivo es la fuga I1: con la ruta, alguien puede probar el
    // bucket. Se publica que el comprobante existe, no dónde está guardado.
    expect(container.innerHTML).not.toContain(RUTA_PRIVADA);
    expect(container.innerHTML).not.toContain("comprobantes/");
    expect(container.innerHTML).not.toContain(".pdf");
    expect(container.innerHTML).not.toContain("storagePath");
  });

  it("con un solo comprobante lo dice en singular", () => {
    render(
      <Ledger expenses={[{ ...conComprobantes, receiptCount: 1 }]} caption={CAPTION} />,
    );

    expect(
      screen.getByText("Tiene 1 comprobante en el archivo interno"),
    ).toBeInTheDocument();
  });

  it("un gasto sin comprobante lo dice, en lugar de dejar la celda en blanco", () => {
    render(<Ledger expenses={[sinComprobante]} caption={CAPTION} />);

    // Una celda vacía se lee como un error de la página. "Sin cargar" es
    // información: el gasto está publicado y el respaldo todavía no.
    expect(screen.getByText("Sin cargar")).toBeInTheDocument();
  });

  it("publica el proveedor cuando existe y no deja un hueco cuando no", () => {
    const { rerender } = render(
      <Ledger expenses={[conComprobantes]} caption={CAPTION} />,
    );

    expect(screen.getByText("Corralón del pueblo")).toBeInTheDocument();

    rerender(<Ledger expenses={[sinComprobante]} caption={CAPTION} />);

    expect(screen.getByRole("rowheader")).toHaveTextContent("Flete");
  });
});
