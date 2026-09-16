import { getContent } from "@/content";
import type { EmailsContent } from "@/content/schema";
import {
  idempotencyKeyFor,
  type EmailMessage,
  type IdentityEmailKind,
} from "@/src/domain/ports/email";
import { localizeHref, type Locale } from "@/src/i18n/locale";

import { renderEmailHtml, renderEmailText } from "./layout";

/**
 * Los correos de identidad: confirmar que la casilla existe, recuperar el
 * acceso, cambiar de dirección.
 *
 * El token lo emite GoTrue. Esta capa sólo arma el mensaje: el enlace lleva
 * `token_hash` porque `/cuenta/confirmar` lo canjea con `verifyOtp`. Los
 * correos del producto no pueden hacer eso (ADR-028).
 */

export interface IdentityFacts {
  readonly userId: string;
  readonly recipient: string;
  readonly locale: Locale;
  readonly confirmUrl: string;
  /** Recorte del token: un reenvío con otro enlace no choca con el Idempotency-Key. */
  readonly tokenStamp: string;
}

const IDENTITY_COPY: Record<IdentityEmailKind, keyof EmailsContent> = {
  "account.confirm": "accountConfirm",
  "account.recover": "accountRecover",
  "account.email_change": "accountEmailChange",
};

const LINK_TYPES = ["signup", "email", "email_change", "recovery", "invite"] as const;

export type IdentityLinkType = (typeof LINK_TYPES)[number];

export function isIdentityLinkType(value: string): value is IdentityLinkType {
  return (LINK_TYPES as readonly string[]).includes(value);
}

/**
 * El enlace que viaja en el correo. El token va en la query porque el route
 * handler de confirmar no lee un fragmento ni un POST.
 */
export function confirmationLink(
  siteUrl: string,
  locale: Locale,
  tokenHash: string,
  type: IdentityLinkType,
): string {
  const path = localizeHref("/cuenta/confirmar", locale);
  const query = new URLSearchParams({ token_hash: tokenHash, type });

  return `${siteUrl}${path}?${query.toString()}`;
}

export function buildIdentityEmail(
  kind: IdentityEmailKind,
  facts: IdentityFacts,
): EmailMessage {
  const copy = getContent(facts.locale).emails[IDENTITY_COPY[kind]];
  const siteName = getContent(facts.locale).site.name;
  const heading = copy.subject;
  const link = facts.confirmUrl;
  const fill = (text: string): string => text.replaceAll("{link}", link);

  const doc = {
    lang: facts.locale,
    siteName,
    preheader: fill(copy.preheader),
    heading,
    paragraphs: copy.body.map(fill),
    highlight: null,
    action: fill(copy.action),
    link,
    why: fill(copy.why),
  };

  return {
    to: facts.recipient,
    subject: heading,
    text: renderEmailText(doc),
    html: renderEmailHtml(doc),
    idempotencyKey: idempotencyKeyFor(kind, `${facts.userId}:${facts.tokenStamp}`),
  };
}
