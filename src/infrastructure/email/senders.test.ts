import { afterEach, describe, expect, it, vi } from "vitest";

import type { EmailMessage } from "@/src/domain/ports/email";

import { LoggingSender } from "./logging-sender";
import { readEmailConfig, readStaffAddress } from "./config";
import { ResendSender } from "./resend-sender";

const MENSAJE: EmailMessage = {
  to: "quien.dona@ejemplo.invalid",
  subject: "Recibimos tu pedido de cuenta",
  text: "Cuerpo",
  html: "<p>Cuerpo</p>",
  idempotencyKey: "account.received/abc",
};

describe("ResendSender", () => {
  it("manda text y html, con Bearer e Idempotency-Key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "re_123" }),
    });

    const sender = new ResendSender({
      apiKey: "re_test",
      from: "La Casa de Norma <hola@lacasadenorma.example>",
      fetchImpl,
    });

    const result = await sender.send("account.received", MENSAJE);

    expect(result).toEqual({ status: "sent", providerId: "re_123" });
    expect(fetchImpl).toHaveBeenCalledOnce();

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer re_test",
      "Content-Type": "application/json",
      "Idempotency-Key": MENSAJE.idempotencyKey,
    });

    if (typeof init.body !== "string") {
      throw new Error("el cuerpo del POST tiene que ser texto");
    }

    const body = JSON.parse(init.body) as Record<string, unknown>;

    expect(body).toEqual({
      from: "La Casa de Norma <hola@lacasadenorma.example>",
      to: [MENSAJE.to],
      subject: MENSAJE.subject,
      text: MENSAJE.text,
      html: MENSAJE.html,
    });
  });

  it("un rechazo del proveedor es failed, no una excepción", async () => {
    const sender = new ResendSender({
      apiKey: "re_test",
      from: "hola@lacasadenorma.example",
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: "Too many requests" }),
      }),
    });

    const result = await sender.send("account.received", MENSAJE);

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/429/);
      expect(result.error).not.toMatch(/re_test/);
    }
  });

  it("una caída de red es failed, con la causa y sin la clave", async () => {
    const sender = new ResendSender({
      apiKey: "re_super_secreta",
      from: "hola@lacasadenorma.example",
      fetchImpl: vi.fn().mockRejectedValue(new Error("fetch failed")),
    });

    const result = await sender.send("account.received", MENSAJE);

    expect(result).toEqual({ status: "failed", error: "fetch failed" });
  });
});

describe("LoggingSender", () => {
  it("no manda nada y lo dice: skipped, no failed", () => {
    const warn = vi.fn();
    const sender = new LoggingSender({ warn });

    return expect(sender.send("account.received", MENSAJE))
      .resolves.toEqual({
        status: "skipped",
        reason: "not-configured",
      })
      .then(() => {
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0]?.[1]).toMatchObject({ kind: "account.received" });
        expect(JSON.stringify(warn.mock.calls[0])).not.toContain(MENSAJE.to);
      });
  });
});

describe("readEmailConfig", () => {
  const previous = {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM_ADDRESS,
    staff: process.env.EMAIL_STAFF_ADDRESS,
  };

  function setEnv(values: {
    apiKey?: string | undefined;
    from?: string | undefined;
    staff?: string | undefined;
  }) {
    const pairs = [
      ["RESEND_API_KEY", values.apiKey],
      ["EMAIL_FROM_ADDRESS", values.from],
      ["EMAIL_STAFF_ADDRESS", values.staff],
    ] as const;

    for (const [key, value] of pairs) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  afterEach(() => {
    setEnv({
      apiKey: previous.apiKey,
      from: previous.from,
      staff: previous.staff,
    });
  });

  it("sin clave o sin remitente no hay configuración, aunque haya dirección del equipo", () => {
    setEnv({ apiKey: "", from: "hola@ejemplo.invalid", staff: "equipo@ejemplo.invalid" });
    expect(readEmailConfig()).toBeNull();

    setEnv({ apiKey: "re_test", from: "", staff: "equipo@ejemplo.invalid" });
    expect(readEmailConfig()).toBeNull();
  });

  it("la dirección del equipo no decide si se puede mandar: es otro dato", () => {
    setEnv({ apiKey: "re_test", from: "La Casa de Norma <hola@ejemplo.invalid>" });
    expect(readEmailConfig()).toEqual({
      apiKey: "re_test",
      from: "La Casa de Norma <hola@ejemplo.invalid>",
    });
    expect(readStaffAddress()).toBeNull();
  });

  it("con los tres datos, el remitente manda y el equipo se lee aparte", () => {
    setEnv({
      apiKey: "re_test",
      from: "hola@ejemplo.invalid",
      staff: "equipo@ejemplo.invalid",
    });
    expect(readEmailConfig()).toEqual({
      apiKey: "re_test",
      from: "hola@ejemplo.invalid",
    });
    expect(readStaffAddress()).toBe("equipo@ejemplo.invalid");
  });
});
