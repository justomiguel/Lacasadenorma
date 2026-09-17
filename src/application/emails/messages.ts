import { getContent } from "@/content";
import type { EmailCopy, EmailsContent } from "@/content/schema";
import {
  idempotencyKeyFor,
  type AccountEmailKind,
  type EmailKind,
  type EmailMessage,
  type PledgeEmailKind,
  type StaffEmailKind,
} from "@/src/domain/ports/email";
import { whatsappHrefFor } from "@/src/domain/whatsapp";
import type { Locale } from "@/src/i18n/locale";

import { renderEmailHtml, renderEmailText } from "./layout";

/**
 * El armado de los correos del producto.
 *
 * Vive en `application/` y no en `infrastructure/` porque no sabe mandar nada:
 * convierte hechos en un `EmailMessage`. Quién lo pone en la red es el adaptador.
 *
 * **No hay motor de plantillas.** Son cinco sustituciones con nombre cerrado.
 */

export interface AccountFacts {
  readonly userId: string;
  readonly recipient: string;
  readonly locale: Locale;
  readonly accountUrl: string;
}

export interface PledgeFacts {
  readonly pledgeId: string;
  readonly recipient: string;
  readonly locale: Locale;
  readonly what: string;
  readonly expiresOn: string | null;
  readonly accountUrl: string;
}

export interface StaffFacts {
  readonly subjectId: string;
  readonly staffAddress: string;
  readonly what: string | null;
  /** El nombre de un aviso por teléfono. El resto de los avisos al equipo no lo usan. */
  readonly who?: string | null;
  /** El número de un aviso por teléfono. Viaja como botón de WhatsApp, no en el resto. */
  readonly phone?: string | null;
  readonly backofficeUrl: string;
  readonly yesUrl?: string | null;
  readonly noUrl?: string | null;
}

const ACCOUNT_COPY: Record<AccountEmailKind, keyof EmailsContent> = {
  "account.received": "accountReceived",
  "account.approved": "accountApproved",
  "account.declined": "accountDeclined",
};

const PLEDGE_COPY: Record<PledgeEmailKind, keyof EmailsContent> = {
  "pledge.confirmed": "pledgeConfirmed",
  "pledge.reminder": "pledgeReminder",
  "pledge.fulfilled": "pledgeFulfilled",
};

const STAFF_COPY: Record<StaffEmailKind, keyof EmailsContent> = {
  "staff.new_account": "staffNewAccount",
  "staff.new_pledge": "staffNewPledge",
  "staff.phone_offer": "staffPhoneOffer",
  "staff.pledge_cancelled": "staffPledgeCancelled",
  "staff.pledge_expired": "staffPledgeExpired",
};

export function buildAccountEmail(
  kind: AccountEmailKind,
  facts: AccountFacts,
): EmailMessage {
  return compose({
    copy: getContent(facts.locale).emails[ACCOUNT_COPY[kind]],
    kind,
    locale: facts.locale,
    to: facts.recipient,
    link: facts.accountUrl,
    replacements: { what: null, when: null },
    highlight: null,
    rejectLink: null,
    extraLink: null,
    idempotencyKey: idempotencyKeyFor(kind, facts.userId),
  });
}

export function buildPledgeEmail(
  kind: PledgeEmailKind,
  facts: PledgeFacts,
): EmailMessage {
  return compose({
    copy: getContent(facts.locale).emails[PLEDGE_COPY[kind]],
    kind,
    locale: facts.locale,
    to: facts.recipient,
    link: facts.accountUrl,
    replacements: { what: facts.what, when: facts.expiresOn },
    highlight: facts.what,
    rejectLink: null,
    extraLink: null,
    idempotencyKey: idempotencyKeyFor(kind, facts.pledgeId),
  });
}

/**
 * No recibe `locale`: el backoffice no se traduce (ADR-014). Un parámetro de
 * idioma sería un lugar donde pasarle, por descuido, el de quien reservó.
 */
export function buildStaffEmail(kind: StaffEmailKind, facts: StaffFacts): EmailMessage {
  const yes = facts.yesUrl ?? facts.backofficeUrl;
  const no = facts.noUrl ?? null;
  const extraLink =
    kind === "staff.phone_offer" && facts.phone !== undefined && facts.phone !== null
      ? whatsappHrefFor(facts.phone)
      : null;

  return compose({
    copy: getContent("es").emails[STAFF_COPY[kind]],
    kind,
    locale: "es",
    to: facts.staffAddress,
    link: yes,
    replacements: {
      what: facts.what,
      when: null,
      who: facts.who ?? null,
      phone: kind === "staff.phone_offer" ? (facts.phone ?? null) : null,
    },
    highlight: facts.what,
    rejectLink: no,
    extraLink,
    idempotencyKey: idempotencyKeyFor(kind, facts.subjectId),
  });
}

interface Composition {
  readonly copy: EmailCopy;
  readonly kind: EmailKind;
  readonly locale: Locale;
  readonly to: string;
  readonly link: string;
  readonly replacements: {
    readonly what: string | null;
    readonly when: string | null;
    readonly who?: string | null;
    readonly phone?: string | null;
  };
  readonly highlight: string | null;
  readonly rejectLink: string | null;
  readonly extraLink: string | null;
  readonly idempotencyKey: string;
}

function compose(input: Composition): EmailMessage {
  const values = { who: null, phone: null, ...input.replacements, link: input.link };
  const fill = (text: string): string => substitute(text, values);
  const siteName = getContent(input.locale).site.name;
  const heading = fill(input.copy.subject);
  const paragraphs = input.copy.body.map(fill);
  const action = fill(input.copy.action);
  const why = fill(input.copy.why);
  const highlight = input.highlight === null ? null : fill(input.highlight) || null;
  const extraAction =
    input.copy.extraAction === undefined ? null : fill(input.copy.extraAction) || null;

  const doc = {
    lang: input.locale,
    siteName,
    preheader: fill(input.copy.preheader),
    heading,
    paragraphs,
    highlight,
    extraAction,
    extraLink: extraAction === null ? null : input.extraLink,
    action,
    link: input.link,
    rejectAction:
      input.copy.rejectAction === undefined ? null : fill(input.copy.rejectAction),
    rejectLink: input.rejectLink,
    why,
  };

  return {
    to: input.to,
    subject: heading,
    text: renderEmailText(doc),
    html: renderEmailHtml(doc),
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Las cinco marcas, y ninguna más.
 *
 * `when` puede no existir —una reserva sin vencimiento—, y en ese caso la frase
 * que la nombraba **se cae entera** en lugar de quedar con un hueco. Lo mismo
 * con `{who}` y `{phone}` si el aviso no es por teléfono.
 */
function substitute(
  text: string,
  values: {
    what: string | null;
    when: string | null;
    who: string | null;
    phone: string | null;
    link: string;
  },
): string {
  if (values.when === null && text.includes("{when}")) {
    return "";
  }

  if (values.what === null && text.includes("{what}")) {
    return "";
  }

  if (values.who === null && text.includes("{who}")) {
    return "";
  }

  if (values.phone === null && text.includes("{phone}")) {
    return "";
  }

  return text
    .replaceAll("{what}", values.what ?? "")
    .replaceAll("{when}", values.when ?? "")
    .replaceAll("{who}", values.who ?? "")
    .replaceAll("{phone}", values.phone ?? "")
    .replaceAll("{link}", values.link);
}
