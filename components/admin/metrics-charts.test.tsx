import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BarChart, SeriesChart } from "@/src/domain/metrics";

import { MetricsBarChart, MetricsSeriesChart } from "./metrics-charts";

const BARS: BarChart = {
  id: "expenses-by-category",
  title: "Gastos por rubro",
  unit: "money",
  currency: "ARS",
  bars: [
    { id: "materiales", label: "Materiales", value: 80_000_00 },
    { id: "transporte", label: "Transporte", value: 20_000_00 },
  ],
  signals: [],
};

const SERIES: SeriesChart = {
  id: "weekly-cash",
  title: "Entradas y salidas por semana",
  unit: "money",
  currency: "ARS",
  series: [
    { id: "inflow", label: "Recibido" },
    { id: "outflow", label: "Gastado" },
  ],
  points: [
    {
      key: "2026-09-14",
      label: "14 – 20 sept",
      values: { inflow: 200_000_00, outflow: 50_000_00 },
    },
  ],
  signals: [
    { id: "average_inflow", label: "Promedio semanal recibido", value: 25_000_00 },
  ],
};

describe("MetricsBarChart", () => {
  it("el título, la cifra y la tabla dicen lo mismo", () => {
    render(<MetricsBarChart chart={BARS} />);

    expect(screen.getByRole("img", { name: "Gastos por rubro" })).toBeInTheDocument();
    expect(document.querySelector("svg.recharts-surface")).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Categoría" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Materiales" })).toBeInTheDocument();
  });
});

describe("MetricsSeriesChart", () => {
  it("nombra la señal de referencia, no sólo la pinta", () => {
    render(<MetricsSeriesChart chart={SERIES} />);

    expect(screen.getByText(/señal · promedio semanal recibido/i)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Recibido" })).toBeInTheDocument();
  });
});
