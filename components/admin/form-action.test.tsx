import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  ActionForm,
  CheckboxField,
  SelectField,
  SubmitButton,
  TextField,
  type ActionState,
} from "./form";
import { FieldErrorsContext, focusFirstInvalidField } from "./form-action";

describe("ActionForm", () => {
  it("mientras guarda, los campos se deshabilitan", async () => {
    const user = userEvent.setup();

    render(
      <ActionForm
        action={() =>
          new Promise<ActionState>(() => {
            /* queda pendiente a propósito */
          })
        }
      >
        <TextField name="nombre" label="Nombre" />
        <SelectField
          name="categoria"
          label="Categoría"
          options={[{ value: "materiales", label: "Materiales" }]}
        />
        <CheckboxField name="publicado" label="Publicado" />
        <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
      </ActionForm>,
    );

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("button", { name: "Guardando…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /nombre/i })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /categoría/i })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /publicado/i })).toBeDisabled();
  });

  it("el foco va al primer campo marcado inválido, no al pie del formulario", () => {
    render(
      <form>
        <FieldErrorsContext.Provider value={{ nombre: "Falta el nombre" }}>
          <TextField name="otro" label="Otro" />
          <TextField name="nombre" label="Nombre" />
        </FieldErrorsContext.Provider>
      </form>,
    );

    focusFirstInvalidField(document.querySelector("form"));

    const field = screen.getByRole("textbox", { name: /nombre/i });

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
  });
});
