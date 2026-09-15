import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PendingTextButton } from "./pending-submit";

describe("PendingTextButton", () => {
  it("mientras el envío corre, el texto cambia y el control se marca ocupado", async () => {
    const user = userEvent.setup();

    render(
      <form
        action={() =>
          new Promise(() => {
            /* queda pendiente a propósito */
          })
        }
      >
        <PendingTextButton pendingLabel="Cerrando…">Cerrar sesión</PendingTextButton>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    const button = await screen.findByRole("button", { name: "Cerrando…" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
