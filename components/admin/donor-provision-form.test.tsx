import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ActionState } from "@/components/admin/form";
import type { ProvisionedDonor } from "@/src/application/admin";

import { DonorProvisionForm } from "./donor-provision-form";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => (
    // El mock de next/image en jsdom: no hay un bundler que lo reemplace.
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} className={className} />
  ),
}));

const CREATED: ProvisionedDonor = {
  userId: "20000000-0000-4000-8000-000000000006",
  email: "ana@ejemplo.com",
  inviteUrl: "https://lacasadenorma.example/cuenta/confirmar?token_hash=abc&type=invite",
  invented: false,
  alreadyExisted: false,
};

function ok(value: ProvisionedDonor, message = "Cuenta cargada."): ActionState {
  return { status: "ok", message, value };
}

describe("DonorProvisionForm", () => {
  it("después de crear no deja Crear la cuenta otra vez", async () => {
    const user = userEvent.setup();

    render(<DonorProvisionForm action={async () => ok(CREATED)} />);

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.click(screen.getByRole("button", { name: /crear la cuenta/i }));

    expect(await screen.findByText("Cuenta cargada.")).toBeInTheDocument();
    expect(screen.getByText(CREATED.inviteUrl)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /crear la cuenta/i })).toBeNull();
  });

  it("si la cuenta ya estaba, el alta sigue para otro nombre", async () => {
    const user = userEvent.setup();

    render(
      <DonorProvisionForm
        action={async () =>
          ok({ ...CREATED, alreadyExisted: true, inviteUrl: "" }, "Esa cuenta ya estaba.")
        }
      />,
    );

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.click(screen.getByRole("button", { name: /crear la cuenta/i }));

    expect(await screen.findByText(/esa cuenta ya estaba/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear la cuenta/i })).toBeInTheDocument();
  });
});
