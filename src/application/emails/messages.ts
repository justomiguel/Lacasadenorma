import { getContent } from "@/content";
import type { EmailsContent } from "@/content/schema";
import {
  idempotencyKeyFor,
  type EmailKind,
  type EmailMessage,
} from "@/src/domain/ports/email";
import type { Locale } from "@/src/i18n/locale";

/**
 * El armado de los cuatro correos del producto.
 *
 * Vive en `application/` y no en `infrastructure/` porque no sabe mandar nada:
 * convierte hechos de una reserva en un `EmailMessage`. Quién lo pone en la red
 * es el adaptador, y por eso se puede probar el texto de los ocho correos —cuatro
 * clases por dos idiomas— sin tocar HTTP.
 *
 * **No hay motor de plantillas.** Son tres sustituciones con nombre cerrado, y el
 * reemplazo es una función de cinco líneas. Un motor traería una gramática que
 * aprender, una dependencia que mantener y la posibilidad de escribir lógica
 * adentro de un correo, que es exactamente lo que no queremos que se pueda hacer.
 */

/** Los tres que recibe quien dona. El cuarto va al equipo y no lleva idioma. */
export const DONOR_EMAIL_KINDS = [
  "pledge.confirmed",
  "pledge.reminder",
  "pledge.fulfilled",
] as const;

export type DonorEmailKind = (typeof DONOR_EMAIL_KINDS)[number];

export interface PledgeFacts {
  readonly pledgeId: string;
  readonly recipient: string;
  /** El de la cuenta, no el de quien disparó la operación (FR-232). */
  readonly locale: Locale;
  /**
   * Lo reservado, ya en palabras: "3 bolsas de cemento".
   *
   * Llega armado y no como cantidad más unidad a propósito. El catálogo es de la
   * fase C y el correo es de la B: si este módulo supiera de `donation_unit`, la
   * fase B no se podría entregar sin la C. Quien llama tiene las dos cosas.
   */
  readonly what: string;
  /** Ya escrita en el idioma de la cuenta. Nula cuando la reserva no vence. */
  readonly expiresOn: string | null;
  readonly accountUrl: string;
}

export interface StaffFacts {
  readonly pledgeId: string;
  readonly staffAddress: string;
  readonly what: string;
  readonly backofficeUrl: string;
}

const COPY_BY_KIND: Record<DonorEmailKind, keyof EmailsContent> = {
  "pledge.confirmed": "pledgeConfirmed",
  "pledge.reminder": "pledgeReminder",
  "pledge.fulfilled": "pledgeFulfilled",
};

export function buildPledgeEmail(kind: DonorEmailKind, facts: PledgeFacts): EmailMessage {
  const copy = getContent(facts.locale).emails[COPY_BY_KIND[kind]];

  return compose({
    copy,
    kind,
    to: facts.recipient,
    link: facts.accountUrl,
    replacements: { what: facts.what, when: facts.expiresOn },
    idempotencyKey: idempotencyKeyFor(kind, facts.pledgeId),
  });
}

/**
 * No recibe `locale`, y la ausencia es la decisión: el backoffice no se traduce
 * (ADR-014), así que este correo va siempre en castellano. Un parámetro de idioma
 * sería un lugar donde pasarle, por descuido, el de la persona que reservó.
 */
export function buildStaffEmail(facts: StaffFacts): EmailMessage {
  return compose({
    copy: getContent("es").emails.staffNewPledge,
    kind: "staff.new_pledge",
    to: facts.staffAddress,
    link: facts.backofficeUrl,
    replacements: { what: facts.what, when: null },
    idempotencyKey: idempotencyKeyFor("staff.new_pledge", facts.pledgeId),
  });
}

interface Composition {
  readonly copy: EmailsContent[keyof EmailsContent];
  readonly kind: EmailKind;
  readonly to: string;
  readonly link: string;
  readonly replacements: { readonly what: string; readonly when: string | null };
  readonly idempotencyKey: string;
}

function compose(input: Composition): EmailMessage {
  const fill = (text: string): string =>
    substitute(text, { ...input.replacements, link: input.link });

  const paragraphs = input.copy.body.map(fill);
  const subject = fill(input.copy.subject);

  return {
    to: input.to,
    subject,
    text: asText(paragraphs, fill(input.copy.action), input.link, input.copy.why),
    html: asHtml(paragraphs, fill(input.copy.action), input.link, input.copy.why),
    idempotencyKey: input.idempotencyKey,
  };
}

/**
 * Las tres marcas, y ninguna más.
 *
 * `when` puede no existir —una reserva sin vencimiento—, y en ese caso la frase
 * que la nombraba **se cae entera** en lugar de quedar con un hueco. Es la regla
 * de "ningún dato inventado llega a la interfaz" aplicada al correo: antes que
 * escribir "vence el " sin fecha, no se escribe la oración.
 */
function substitute(
  text: string,
  values: { what: string; when: string | null; link: string },
): string {
  if (values.when === null && text.includes("{when}")) {
    return "";
  }

  return text
    .replaceAll("{what}", values.what)
    .replaceAll("{when}", values.when ?? "")
    .replaceAll("{link}", values.link);
}

function asText(
  paragraphs: readonly string[],
  action: string,
  link: string,
  why: string,
): string {
  // El cuerpo sin formato no se deriva del html: se arma con los mismos párrafos.
  // El enlace va en su propia línea, entero y sin acortar, porque un cliente de
  // texto no lo va a hacer clickeable y alguien lo va a copiar a mano.
  return [...paragraphs.filter(noVacio), `${action}: ${link}`, "—", why].join("\n\n");
}

function asHtml(
  paragraphs: readonly string[],
  action: string,
  link: string,
  why: string,
): string {
  const cuerpo = paragraphs
    .filter(noVacio)
    .map((text) => `<p>${escape(text)}</p>`)
    .join("\n");

  return [
    cuerpo,
    `<p><a href="${escape(link)}">${escape(action)}</a></p>`,
    `<hr>`,
    `<p><small>${escape(why)}</small></p>`,
  ].join("\n");
}

function noVacio(text: string): boolean {
  return text.length > 0;
}

/**
 * El contenido es del repositorio, no de la red, así que esto no es una defensa
 * contra un ataque: es contra un apóstrofe o un `&` en la prosa rompiendo el html
 * del correo en algún cliente viejo.
 */
function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
