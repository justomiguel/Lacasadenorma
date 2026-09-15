import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getContent } from "@/content/pack";

import { SocialAuth } from "./social-auth";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/app/(es)/cuenta/oauth-actions", () => ({
  startOAuth: () =>
    new Promise(() => {
      /* queda pendiente a propósito */
    }),
}));

const account = getContent("es").account;

describe("SocialAuth", () => {
  it("sólo el proveedor tocado cambia el texto; los otros se deshabilitan", async () => {
    const user = userEvent.setup();

    render(
      <SocialAuth
        copy={account.social}
        errors={account.errors}
        locale="es"
        providers={["google", "apple"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /continuar con google/i }));

    const google = await screen.findByRole("button", { name: /redirigiendo/i });
    const apple = screen.getByRole("button", { name: /continuar con apple/i });

    expect(google).toBeDisabled();
    expect(google).toHaveAttribute("aria-busy", "true");
    expect(apple).toBeDisabled();
    expect(apple).not.toHaveAttribute("aria-busy", "true");
  });
});
