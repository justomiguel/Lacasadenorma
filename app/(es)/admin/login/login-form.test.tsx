import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

vi.mock("./actions", () => ({
  signIn: () =>
    new Promise(() => {
      /* queda pendiente a propósito */
    }),
}));

describe("LoginForm", () => {
  it("mientras entra, los campos se deshabilitan y el botón se marca ocupado", async () => {
    const user = userEvent.setup();

    render(<LoginForm next={null} />);

    await user.type(screen.getByLabelText("Correo"), "editora@ejemplo.invalid");
    await user.type(screen.getByLabelText("Contraseña"), "clave-larga");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("button", { name: "Entrando…" })).toBeDisabled();
    expect(screen.getByLabelText("Correo")).toBeDisabled();
    expect(screen.getByLabelText("Contraseña")).toBeDisabled();
  });
});
