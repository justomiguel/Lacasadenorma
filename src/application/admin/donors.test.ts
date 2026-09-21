import { describe, expect, it, vi } from "vitest";

import type { EmailResult, EmailSender } from "@/src/domain/ports/email";

import { reviewDonorAccount } from "./donors";
import { deps } from "./admin-test-helpers";

const CUENTA = "20000000-0000-4000-8000-000000000006";

function mail(options: {
  recipient?: string | null;
  send?: EmailResult;
  failSend?: Error;
  failRecord?: Error;
}) {
  const sent: { kind: string; to: string }[] = [];
  const recorded: { kind: string; status: string }[] = [];
  const sender: EmailSender = {
    send: async (kind, message) => {
      if (options.failSend !== undefined) {
        throw options.failSend;
      }

      sent.push({ kind, to: message.to });

      return options.send ?? { status: "sent", providerId: "re_test" };
    },
  };

  return {
    sent,
    recorded,
    mail: {
      sender,
      siteUrl: "https://lacasadenorma.example",
      contactOf: async () =>
        options.recipient === undefined
          ? "quien.dona@ejemplo.invalid"
          : options.recipient,
      record: async ({
        kind,
        result,
      }: {
        kind: "account.approved" | "account.declined";
        result: EmailResult;
      }) => {
        if (options.failRecord !== undefined) {
          throw options.failRecord;
        }

        recorded.push({ kind, status: result.status });
      },
    },
  };
}

describe("reviewDonorAccount", () => {
  it("habilita, deja rastro y manda el correo después", async () => {
    const { deps: admin, fake } = deps("admin");
    const aviso = mail({});
    const result = await reviewDonorAccount(
      admin,
      { userId: CUENTA, decision: "approved", locale: "es" },
      aviso.mail,
    );

    expect(result.status).toBe("ok");
    expect(result.status === "ok" ? result.message : "").toBe("Cuenta habilitada.");
    expect(fake.calls[0]).toMatchObject({
      name: "reviewAccount",
      input: { userId: CUENTA, decision: "approved", note: null },
    });
    expect(fake.audit[0]).toMatchObject({
      action: "donor.approved",
      entityTable: "donor_profiles",
      entityId: CUENTA,
    });
    expect(aviso.sent).toEqual([
      { kind: "account.approved", to: "quien.dona@ejemplo.invalid" },
    ]);
    expect(aviso.recorded).toEqual([{ kind: "account.approved", status: "sent" }]);
  });

  it("un rechazo deja rastro distinto y el correo de rechazo", async () => {
    const { deps: admin, fake } = deps("admin");
    const aviso = mail({});
    const result = await reviewDonorAccount(
      admin,
      {
        userId: CUENTA,
        decision: "declined",
        locale: "en",
        note: "  No es de la campaña  ",
      },
      aviso.mail,
    );

    expect(result.status).toBe("ok");
    expect(fake.calls[0]).toMatchObject({
      input: { decision: "declined", note: "No es de la campaña" },
    });
    expect(fake.audit[0]).toMatchObject({
      action: "donor.declined",
      diff: { note: true },
    });
    expect(aviso.sent[0]?.kind).toBe("account.declined");
  });

  it("si el correo no sale, la decisión ya está tomada", async () => {
    const { deps: admin, fake } = deps("admin");
    const aviso = mail({ failSend: new Error("resend caído") });
    const error = vi.spyOn(admin.logger, "error");
    const result = await reviewDonorAccount(
      admin,
      { userId: CUENTA, decision: "approved", locale: "es" },
      aviso.mail,
    );

    expect(result.status).toBe("ok");
    expect(fake.audit).toHaveLength(1);
    expect(aviso.recorded).toEqual([]);
    expect(error).toHaveBeenCalledOnce();
  });

  it("sin correo de contacto no inventa un destinatario", async () => {
    const { deps: admin } = deps("admin");
    const aviso = mail({ recipient: null });
    const result = await reviewDonorAccount(
      admin,
      { userId: CUENTA, decision: "approved", locale: "es" },
      aviso.mail,
    );

    expect(result.status).toBe("ok");
    expect(aviso.sent).toEqual([]);
  });
});
