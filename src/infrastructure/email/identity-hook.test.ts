import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { IdentityFacts } from "@/src/application/emails/identity";
import type { IdentityEmailKind } from "@/src/domain/ports/email";

import { sendIdentityMail } from "./send-identity";

const SECRET = Buffer.from("hook-secret-de-prueba").toString("base64");
const TOKEN = "hashed-token-de-prueba";
const STAMP = "1710000000";
const ID = "msg_hook_1";

vi.mock("./send-identity", () => ({
  sendIdentityMail: vi.fn(),
}));

vi.mock("@/src/infrastructure/site-url", () => ({
  getSiteUrl: () => "https://lacasadenorma.example",
}));

const sendMock = vi.mocked(sendIdentityMail);

function sign(payload: string): string {
  const digest = createHmac("sha256", Buffer.from(SECRET, "base64"))
    .update(`${ID}.${STAMP}.${payload}`)
    .digest("base64");

  return `v1,${digest}`;
}

function requestOf(payload: string, signature = sign(payload)): Request {
  return new Request("https://lacasadenorma.example/api/correo/identidad", {
    method: "POST",
    headers: {
      "webhook-id": ID,
      "webhook-timestamp": STAMP,
      "webhook-signature": signature,
    },
    body: payload,
  });
}

describe("handleIdentityEmailHook", () => {
  afterEach(() => {
    delete process.env.SEND_EMAIL_HOOK_SECRET;
    sendMock.mockReset();
    vi.useRealTimers();
  });

  it("manda el correo de confirmar por Resend con el token de GoTrue", async () => {
    process.env.SEND_EMAIL_HOOK_SECRET = SECRET;
    vi.useFakeTimers();
    vi.setSystemTime(Number(STAMP) * 1000);
    sendMock.mockResolvedValue({ status: "sent", providerId: "re_1" });

    const payload = JSON.stringify({
      user: {
        id: "7f1c9a52-0000-4000-8000-000000000009",
        email: "quien.dona@ejemplo.invalid",
        user_metadata: { locale: "es" },
      },
      email_data: {
        token_hash: TOKEN,
        email_action_type: "signup",
      },
    });

    const { handleIdentityEmailHook } = await import("./identity-hook");
    const response = await handleIdentityEmailHook(requestOf(payload));

    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledOnce();

    const [kind, facts] = sendMock.mock.calls[0] as [IdentityEmailKind, IdentityFacts];

    expect(kind).toBe("account.confirm");
    expect(facts.recipient).toBe("quien.dona@ejemplo.invalid");
    expect(facts.confirmUrl).toContain(`token_hash=${TOKEN}`);
    expect(facts.confirmUrl).toContain("/cuenta/confirmar");
  });

  it("sin firma válida no manda nada", async () => {
    process.env.SEND_EMAIL_HOOK_SECRET = SECRET;
    vi.useFakeTimers();
    vi.setSystemTime(Number(STAMP) * 1000);

    const { handleIdentityEmailHook } = await import("./identity-hook");
    const response = await handleIdentityEmailHook(requestOf("{}", "v1,nope"));

    expect(response.status).toBe(401);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
