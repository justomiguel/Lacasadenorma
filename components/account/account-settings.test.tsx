import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountSettings } from "@/components/account/account-settings";
import type { ChromeSession } from "@/components/site/session";
import { getContent } from "@/content";
import type { DonorProfile } from "@/src/domain/entities/donor";

const { mockDeSesion } = vi.hoisted(() => ({
  mockDeSesion: vi.fn(
    (): { session: ChromeSession; portraitSrc: string | null; refresh: () => void } => ({
      session: { status: "anonymous" },
      portraitSrc: null,
      refresh: () => undefined,
    }),
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/components/site/session", () => ({
  useChromeSession: mockDeSesion,
}));

const profile: DonorProfile = {
  userId: "00000000-0000-4000-8000-000000000001",
  displayName: null,
  locale: "es",
  defaultAnonymous: true,
  approvalStatus: "pending",
  portraitPath: null,
};

describe("AccountSettings", () => {
  const { account } = getContent("es");

  it("los cuatro bloques están a la vista, sin pestañas", () => {
    const { container } = render(
      <AccountSettings
        locale="es"
        copy={account.profile}
        errors={account.errors}
        fields={account.fields}
        profile={profile}
        password={account.password}
        initial="cuenta"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: /^tu cuenta$/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /^tu foto$/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /cómo querés aparecer/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /^contraseña$/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /borrar la cuenta/i })).toBeVisible();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(container.querySelector("#foto")).not.toBeNull();
    expect(container.querySelector("#aparecer")).not.toBeNull();
    expect(container.querySelector("#acceso")).not.toBeNull();
    expect(container.querySelector("#borrar")).not.toBeNull();
  });
});
