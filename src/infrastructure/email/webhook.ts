import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * La firma Standard Webhooks que Auth pone en el hook de correo.
 *
 * El secreto llega como `v1,whsec_<base64>` (panel de Supabase) o como el
 * `<base64>` pelado. Auth firma `${id}.${timestamp}.${body}` con HMAC-SHA256.
 * Sin esta comprobación, cualquiera podría POST-ear a la ruta y mandar un
 * correo con un enlace inventado a una casilla ajena.
 */

const MAX_AGE_SECONDS = 300;

export function readSendEmailHookSecret(): string | null {
  const raw = process.env.SEND_EMAIL_HOOK_SECRET?.trim();

  if (raw === undefined || raw.length === 0) {
    return null;
  }

  const stripped = raw.replace(/^v1,/, "").replace(/^whsec_/, "");

  return stripped.length === 0 ? null : stripped;
}

export function verifyStandardWebhook(input: {
  readonly secret: string;
  readonly payload: string;
  readonly id: string;
  readonly timestamp: string;
  readonly signatureHeader: string;
  readonly nowMs?: number;
}): boolean {
  const stamped = Number(input.timestamp);

  if (!Number.isFinite(stamped)) {
    return false;
  }

  const now = (input.nowMs ?? Date.now()) / 1000;

  if (Math.abs(now - stamped) > MAX_AGE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", Buffer.from(input.secret, "base64"))
    .update(`${input.id}.${input.timestamp}.${input.payload}`)
    .digest();

  return signaturesOf(input.signatureHeader).some((signature) => {
    try {
      const actual = Buffer.from(signature, "base64");

      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  });
}

function signaturesOf(header: string): readonly string[] {
  return header.split(/\s+/u).flatMap((part) => {
    const separator = part.indexOf(",");

    if (separator <= 0) {
      return [];
    }

    const version = part.slice(0, separator);
    const signature = part.slice(separator + 1);

    return version === "v1" && signature.length > 0 ? [signature] : [];
  });
}
