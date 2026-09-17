import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EMPTY_METRICS_FACTS } from "@/src/domain/metrics";
import { buildOwnerMetrics } from "@/src/domain/metrics-build";
import type { AnalyticsSnapshot } from "@/src/domain/metrics-analytics";

import { MetricsBoard } from "./metrics-board";

const NOW = new Date("2026-09-16T12:00:00.000Z");

const SNAPSHOT: AnalyticsSnapshot = {
  periodDays: 30,
  totals: {
    visitors: 80,
    pageviews: 140,
    bounceRate: 42,
    visitDurationSeconds: 94,
  },
  timeseries: [{ date: "2026-09-14", visitors: 10, pageviews: 18 }],
  pages: [{ name: "/ayudar", value: 40 }],
  sources: [{ name: "(direct)", value: 25 }],
  devices: [{ name: "mobile", value: 50 }],
  browsers: [{ name: "Chrome", value: 48 }],
  entryPages: [{ name: "/", value: 30 }],
  countries: [{ name: "Argentina", value: 60 }],
  events: [{ name: "ayudar_click", value: 12 }],
  helpOrigins: [{ name: "encabezado", value: 8 }],
  copiedFields: [],
  shareChannels: [],
  paymentMedia: [],
};

describe("MetricsBoard", () => {
  it("sin proveedor no dibuja el panel de alcance", () => {
    render(<MetricsBoard metrics={buildOwnerMetrics(null, EMPTY_METRICS_FACTS, NOW)} />);

    expect(screen.queryByRole("heading", { name: "Alcance" })).not.toBeInTheDocument();
    expect(screen.getByText(/el alcance no se lee acá/i)).toBeInTheDocument();
  });

  it("con observaciones muestra visitantes, vistas y las intenciones", () => {
    render(
      <MetricsBoard
        metrics={buildOwnerMetrics(null, EMPTY_METRICS_FACTS, NOW, {
          status: "ok",
          snapshot: SNAPSHOT,
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "Alcance" })).toBeInTheDocument();
    const alcance = screen.getByRole("heading", { name: "Alcance" }).closest("section");
    expect(alcance).toHaveTextContent("Visitantes");
    expect(alcance).toHaveTextContent("Clic en Ayudar");
    expect(alcance).toHaveTextContent(/15\s*%/);
    expect(screen.getByRole("img", { name: /visitantes y vistas/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /navegadores/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /por dónde entran/i })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /desde dónde tocan ayudar/i }),
    ).toBeInTheDocument();
  });
});
