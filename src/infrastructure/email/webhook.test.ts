import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { readSendEmailHookSecret, verifyStandardWebhook } from "./webhook";

const SECRET = Buffer.from("hook-secret-de-prueba").toString("base64");
const PAYLOAD = '{"user":{}}';
const ID = "msg_1";
const STAMP = "1710000000";

function sign(secret: string, id: string, timestamp: string, payload: string): string {
  const digest = createHmac("sha256", Buffer.from(secret, "base64"))
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");

  return `v1,${digest}`;
}

describe("readSendEmailHookSecret", () => {
  afterEach(() => {
    delete process.env.SEND_EMAIL_HOOK_SECRET;
  });

  it("acepta el prefijo del panel y el valor pelado", () => {
    process.env.SEND_EMAIL_HOOK_SECRET = `v1,whsec_${SECRET}`;
    expect(readSendEmailHookSecret()).toBe(SECRET);

    process.env.SEND_EMAIL_HOOK_SECRET = SECRET;
    expect(readSendEmailHookSecret()).toBe(SECRET);
  });

  it("sin variable no hay secreto", () => {
    expect(readSendEmailHookSecret()).toBeNull();
  });
});

describe("verifyStandardWebhook", () => {
  it("acepta una firma v1 vigente", () => {
    expect(
      verifyStandardWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        id: ID,
        timestamp: STAMP,
        signatureHeader: sign(SECRET, ID, STAMP, PAYLOAD),
        nowMs: Number(STAMP) * 1000,
      }),
    ).toBe(true);
  });

  it("rechaza una firma ajena, un cuerpo tocado y un sello viejo", () => {
    const valid = sign(SECRET, ID, STAMP, PAYLOAD);

    expect(
      verifyStandardWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        id: ID,
        timestamp: STAMP,
        signatureHeader: "v1,aaaa",
        nowMs: Number(STAMP) * 1000,
      }),
    ).toBe(false);

    expect(
      verifyStandardWebhook({
        secret: SECRET,
        payload: `${PAYLOAD} `,
        id: ID,
        timestamp: STAMP,
        signatureHeader: valid,
        nowMs: Number(STAMP) * 1000,
      }),
    ).toBe(false);

    expect(
      verifyStandardWebhook({
        secret: SECRET,
        payload: PAYLOAD,
        id: ID,
        timestamp: STAMP,
        signatureHeader: valid,
        nowMs: (Number(STAMP) + 301) * 1000,
      }),
    ).toBe(false);
  });
});
