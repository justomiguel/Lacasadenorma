import { describe, expect, it, vi } from "vitest";

import type { DonorAccountAdminRecord } from "@/src/domain/entities/donor";
import type { EmailResult, EmailSender } from "@/src/domain/ports/email";

import {
  provisionDonorAccount,
  regenerateDonorInvite,
  reviewDonorAccount,
  type DonorAuthPort,
  type ProvisionMail,
} from "./donors";
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

function fakeAuth(options: { userId: string; exists?: boolean }) {
  const invited: string[] = [];
  const port: DonorAuthPort = {
    createConfirmedUser: async () =>
      options.exists === true
        ? { status: "exists", userId: options.userId }
        : { status: "created", userId: options.userId },
    inviteUrl: async ({ email }) => {
      invited.push(email);

      return "https://lacasadenorma.example/cuenta/confirmar?token_hash=abc&type=invite";
    },
    listTakenInventedEmails: async () => [],
  };

  return { port, invited };
}

function existingAccount(userId: string): DonorAccountAdminRecord {
  return {
    userId,
    email: "ana@ejemplo.com",
    displayName: "Ana",
    locale: "es",
    defaultAnonymous: true,
    approvalStatus: "approved",
    createdAt: "2026-09-20T00:00:00.000Z",
    reviewedAt: "2026-09-20T00:00:00.000Z",
    reviewNote: null,
    contactPhone: null,
  };
}

function withDonorLookups(
  fake: ReturnType<typeof deps>["fake"],
  options: { account?: DonorAccountAdminRecord | null; email?: string | null },
) {
  if (options.account !== undefined) {
    fake.gateway.donors.getAccount = async (userId) => {
      fake.calls.push({ name: "getAccount", input: userId });

      return options.account ?? null;
    };
  }

  if (options.email !== undefined) {
    fake.gateway.donors.contactOf = async (userId) => {
      fake.calls.push({ name: "contactOf", input: userId });

      return options.email ?? null;
    };
  }
}

function inviteMail(options: { failSend?: Error }) {
  const sent: { kind: string; to: string }[] = [];
  const mail: ProvisionMail = {
    sender: {
      send: async (kind, message) => {
        if (options.failSend !== undefined) throw options.failSend;
        sent.push({ kind, to: message.to });
        return { status: "sent", providerId: "re_test" };
      },
    },
    siteUrl: "https://lacasadenorma.example",
    record: async () => undefined,
  };

  return { sent, mail };
}

describe("provisionDonorAccount", () => {
  it("sin mail inventa @lacasadenorma.com, habilita y no manda correo", async () => {
    const { deps: admin, fake } = deps("admin");
    const auth = fakeAuth({ userId: CUENTA });
    const aviso = inviteMail({});
    const result = await provisionDonorAccount(
      admin,
      { displayName: "María Pérez", email: "", phone: "11 1234-5678" },
      auth.port,
      aviso.mail,
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.value.email).toBe("maria.perez@lacasadenorma.com");
    expect(result.value.invented).toBe(true);
    expect(result.value.alreadyExisted).toBe(false);
    expect(fake.calls.find((c) => c.name === "provisionProfile")).toMatchObject({
      input: { userId: CUENTA, displayName: "María Pérez", phone: "11 1234-5678" },
    });
    expect(fake.audit[0]).toMatchObject({
      action: "donor.provisioned",
      diff: { invented: true },
    });
    expect(aviso.sent).toEqual([]);
  });

  it("con mail real manda account.invite", async () => {
    const { deps: admin } = deps("admin");
    const auth = fakeAuth({ userId: CUENTA });
    const aviso = inviteMail({});
    const result = await provisionDonorAccount(
      admin,
      { displayName: "Ana", email: "ana@ejemplo.com" },
      auth.port,
      aviso.mail,
    );

    expect(result.status).toBe("ok");
    expect(aviso.sent).toEqual([{ kind: "account.invite", to: "ana@ejemplo.com" }]);
  });

  it("mail repetido con perfil no crea otra y marca alreadyExisted", async () => {
    const { deps: admin, fake } = deps("admin");
    withDonorLookups(fake, { account: existingAccount(CUENTA) });
    const auth = fakeAuth({ userId: CUENTA, exists: true });
    const result = await provisionDonorAccount(
      admin,
      { displayName: "Ana", email: "ana@ejemplo.com" },
      auth.port,
      null,
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.value.alreadyExisted).toBe(true);
    expect(result.value.userId).toBe(CUENTA);
    expect(result.value.inviteUrl).toBe("");
    expect(fake.calls.find((c) => c.name === "provisionProfile")).toBeUndefined();
  });

  it("mail ya en Auth sin perfil termina de provisionar", async () => {
    const { deps: admin, fake } = deps("admin");
    const auth = fakeAuth({ userId: CUENTA, exists: true });
    const result = await provisionDonorAccount(
      admin,
      { displayName: "Ana", email: "ana@ejemplo.com" },
      auth.port,
      null,
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.value.alreadyExisted).toBe(false);
    expect(result.value.inviteUrl).toContain("type=invite");
    expect(fake.calls.find((c) => c.name === "provisionProfile")).toMatchObject({
      input: { userId: CUENTA, displayName: "Ana" },
    });
  });

  it("editor no provisiona", async () => {
    const { deps: editor } = deps("editor");
    const result = await provisionDonorAccount(
      editor,
      { displayName: "Ana" },
      fakeAuth({ userId: CUENTA }).port,
      null,
    );

    expect(result.status).toBe("rejected");
  });
});

describe("regenerateDonorInvite", () => {
  it("resuelve el correo en el servidor y no deja rastro", async () => {
    const { deps: admin, fake } = deps("admin");
    withDonorLookups(fake, { email: "ana@ejemplo.com" });
    const auth = fakeAuth({ userId: CUENTA });
    const result = await regenerateDonorInvite(admin, { userId: CUENTA }, auth.port);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.value.inviteUrl).toContain("type=invite");
    expect(auth.invited).toEqual(["ana@ejemplo.com"]);
    expect(fake.audit).toEqual([]);
  });

  it("después de confirmar, el puerto puede devolver recovery y igual hay URL", async () => {
    const { deps: admin, fake } = deps("admin");
    withDonorLookups(fake, { email: "ana@ejemplo.com" });
    const auth = fakeAuth({ userId: CUENTA });
    auth.port.inviteUrl = async ({ email }) => {
      auth.invited.push(email);

      return "https://lacasadenorma.example/cuenta/confirmar?token_hash=abc&type=recovery";
    };
    const result = await regenerateDonorInvite(admin, { userId: CUENTA }, auth.port);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.value.inviteUrl).toContain("type=recovery");
    expect(auth.invited).toEqual(["ana@ejemplo.com"]);
  });

  it("no usa el correo que mande el formulario", async () => {
    const { deps: admin, fake } = deps("admin");
    withDonorLookups(fake, { email: "ana@ejemplo.com" });
    const auth = fakeAuth({ userId: CUENTA });
    const result = await regenerateDonorInvite(
      admin,
      { userId: CUENTA, email: "spoof@evil.example" },
      auth.port,
    );

    expect(result.status).toBe("ok");
    expect(auth.invited).toEqual(["ana@ejemplo.com"]);
  });

  it("sin correo de contacto no inventa un enlace", async () => {
    const { deps: admin, fake } = deps("admin");
    withDonorLookups(fake, { email: null });
    const auth = fakeAuth({ userId: CUENTA });
    const result = await regenerateDonorInvite(admin, { userId: CUENTA }, auth.port);

    expect(result.status).toBe("failed");
    expect(auth.invited).toEqual([]);
  });

  it("editor no regenera el enlace", async () => {
    const { deps: editor } = deps("editor");
    const result = await regenerateDonorInvite(
      editor,
      { userId: CUENTA },
      fakeAuth({ userId: CUENTA }).port,
    );

    expect(result.status).toBe("rejected");
  });
});
