import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getContent } from "@/content/pack";

import { ErrorScreen } from "./error-screen";
import { ErrorStackDialog } from "./error-stack-dialog";

const { ui } = getContent("es");

describe("ErrorScreen", () => {
  it("muestra el estado diseñado y no el stack si no hay detalle", () => {
    const error = { name: "Error", message: "secreto interno" } as Error & {
      digest?: string;
    };

    render(
      <ErrorScreen
        error={error}
        retry={() => undefined}
        copy={ui.errorPage}
        homeHref="/"
      />,
    );

    expect(
      screen.getByRole("heading", { name: /esto no se pudo completar/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /intentar de nuevo/i })).toBeVisible();
    expect(screen.queryByText(/detalle técnico/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secreto interno/i)).not.toBeInTheDocument();
  });

  it("muestra el stack cuando Next lo serializa", () => {
    const error = new Error("JWT expired");
    error.stack = "Error: JWT expired\n    at recordEmailDelivery";

    render(
      <ErrorScreen
        error={error}
        retry={() => undefined}
        copy={ui.errorPage}
        homeHref="/"
      />,
    );

    expect(screen.getByText(/detalle técnico/i)).toBeVisible();
    expect(screen.getByText(/JWT expired/)).toBeVisible();
  });
});

describe("ErrorStackDialog", () => {
  it("es un diálogo modal con el diagnóstico", () => {
    render(
      <ErrorStackDialog
        copy={ui.errorPage}
        diagnostic={{
          name: "QueryError",
          message: "registrar el envío: JWT expired (PGRST301) [401]",
          status: 401,
          stack: "QueryError: registrar el envío",
        }}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /esto no se pudo completar/i });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(/401/)).toBeVisible();
  });
});
