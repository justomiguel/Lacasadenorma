import { beforeEach, describe, expect, it, vi } from "vitest";

import { recordEmailDelivery } from "./deliveries";

const sessionRpc = vi.fn();
const secretRpc = vi.fn();
const getUser = vi.fn();

vi.mock("../supabase/server-client", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("../supabase/auth-admin", () => ({
  createAuthAdminClient: vi.fn(),
}));

vi.mock("../logging/diagnostic", () => ({
  publishErrorDiagnostic: vi.fn(async () => undefined),
}));

import { createAuthAdminClient } from "../supabase/auth-admin";
import { createServerSupabaseClient } from "../supabase/server-client";

const sessionClient = {
  auth: { getUser },
  rpc: sessionRpc,
};

describe("recordEmailDelivery", () => {
  beforeEach(() => {
    sessionRpc.mockReset();
    secretRpc.mockReset();
    getUser.mockReset();
    vi.mocked(createServerSupabaseClient).mockResolvedValue(sessionClient as never);
    vi.mocked(createAuthAdminClient).mockReturnValue(null);
  });

  it("con sesión llama al RPC con el cliente de quien donó", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "20000000-0000-4000-8000-000000000001" } },
    });
    sessionRpc.mockResolvedValue({ error: null });

    await recordEmailDelivery({
      kind: "pledge.confirmed",
      subjectId: "30000000-0000-4000-8000-000000000001",
      result: { status: "skipped", reason: "not-configured" },
    });

    expect(sessionRpc).toHaveBeenCalledTimes(1);
    expect(secretRpc).not.toHaveBeenCalled();
  });

  it("sin sesión no pega a PostgREST como anon: eso era el 401", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      recordEmailDelivery({
        kind: "staff.phone_offer",
        subjectId: "30000000-0000-4000-8000-000000000003",
        result: { status: "skipped", reason: "not-configured" },
      }),
    ).rejects.toMatchObject({
      name: "QueryError",
      status: 401,
    });

    expect(sessionRpc).not.toHaveBeenCalled();
  });

  it("sin sesión y con clave secreta anota el correo de equipo", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    secretRpc.mockResolvedValue({ error: null });
    vi.mocked(createAuthAdminClient).mockReturnValue({
      rpc: secretRpc,
    } as never);

    await recordEmailDelivery({
      kind: "staff.phone_offer",
      subjectId: "30000000-0000-4000-8000-000000000003",
      result: { status: "skipped", reason: "not-configured" },
    });

    expect(sessionRpc).not.toHaveBeenCalled();
    expect(secretRpc).toHaveBeenCalledTimes(1);
    expect(secretRpc.mock.calls[0]?.[0]).toBe("record_email_delivery");
  });
});
