import {
  confirmationLink,
  isIdentityLinkType,
  type IdentityLinkType,
} from "@/src/application/emails/identity";
import type { IdentityEmailKind } from "@/src/domain/ports/email";
import { isLocale, type Locale } from "@/src/i18n/locale";
import { logger } from "@/src/infrastructure/logging/logger";
import { getSiteUrl } from "@/src/infrastructure/site-url";

import { sendIdentityMail } from "./send-identity";
import { readSendEmailHookSecret, verifyStandardWebhook } from "./webhook";

/**
 * El hook de Auth: GoTrue entrega el token, Resend manda el correo.
 *
 * Cuando está habilitado, Auth **no** manda por SMTP. Un 2xx acá es "el correo
 * se consideró enviado". `skipped` (sin API key) también es 2xx: un entorno
 * sin Resend no puede frenar el alta. Un fallo del proveedor es 500, para que
 * Auth reintente.
 */

interface HookUser {
  readonly id?: unknown;
  readonly email?: unknown;
  readonly user_metadata?: unknown;
}

interface HookEmailData {
  readonly token_hash?: unknown;
  readonly email_action_type?: unknown;
}

interface HookBody {
  readonly user?: HookUser;
  readonly email_data?: HookEmailData;
}

export async function handleIdentityEmailHook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const secret = readSendEmailHookSecret();

  if (secret === null) {
    logger.warn("El hook de correo de Auth llegó y no hay SEND_EMAIL_HOOK_SECRET");

    return new Response(null, { status: 401 });
  }

  const payload = await request.text();
  const id = request.headers.get("webhook-id") ?? "";
  const timestamp = request.headers.get("webhook-timestamp") ?? "";
  const signature = request.headers.get("webhook-signature") ?? "";

  if (
    !verifyStandardWebhook({
      secret,
      payload,
      id,
      timestamp,
      signatureHeader: signature,
    })
  ) {
    logger.warn("Hook de correo de Auth con firma rechazada");

    return new Response(null, { status: 401 });
  }

  const parsed = parseBody(payload);

  if (parsed === null) {
    logger.warn("Hook de correo de Auth con cuerpo que no se puede armar");

    return new Response(null, { status: 400 });
  }

  const result = await sendIdentityMail(parsed.kind, {
    userId: parsed.userId,
    recipient: parsed.recipient,
    locale: parsed.locale,
    confirmUrl: parsed.confirmUrl,
    tokenStamp: parsed.tokenHash.slice(0, 8),
  });

  if (result.status === "failed") {
    logger.error("Resend rechazó un correo de identidad", { error: result.error });

    return Response.json({ error: { message: "send_failed" } }, { status: 500 });
  }

  return new Response(null, { status: 200 });
}

function parseBody(payload: string): {
  readonly kind: IdentityEmailKind;
  readonly userId: string;
  readonly recipient: string;
  readonly locale: Locale;
  readonly confirmUrl: string;
  readonly tokenHash: string;
} | null {
  let body: HookBody;

  try {
    body = JSON.parse(payload) as HookBody;
  } catch {
    return null;
  }

  const email = asNonEmpty(body.user?.email);
  const userId = asNonEmpty(body.user?.id);
  const tokenHash = asNonEmpty(body.email_data?.token_hash);
  const action = asNonEmpty(body.email_data?.email_action_type);

  if (email === null || userId === null || tokenHash === null || action === null) {
    return null;
  }

  const locale = localeOf(body.user?.user_metadata);
  const type = linkTypeOf(action);

  if (type === null) {
    return null;
  }

  return {
    kind: kindOf(action),
    userId,
    recipient: email,
    locale,
    confirmUrl: confirmationLink(getSiteUrl(), locale, tokenHash, type),
    tokenHash,
  };
}

function kindOf(action: string): IdentityEmailKind {
  if (action === "recovery") {
    return "account.recover";
  }

  if (action.startsWith("email_change")) {
    return "account.email_change";
  }

  return "account.confirm";
}

function linkTypeOf(action: string): IdentityLinkType | null {
  if (isIdentityLinkType(action)) {
    return action;
  }

  if (action.startsWith("email_change")) {
    return "email_change";
  }

  return null;
}

function localeOf(metadata: unknown): Locale {
  if (typeof metadata !== "object" || metadata === null || !("locale" in metadata)) {
    return "es";
  }

  const value = metadata.locale;

  return typeof value === "string" && isLocale(value) ? value : "es";
}

function asNonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
