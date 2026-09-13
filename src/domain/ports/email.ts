/**
 * El puerto del correo del producto.
 *
 * Ninguno de estos es de identidad: la confirmación de la cuenta, la recuperación
 * de la contraseña y el cambio de dirección los manda el servidor de Auth por SMTP,
 * porque llevan un token firmado que sólo él sabe emitir (ADR-028).
 *
 * TypeScript puro: sin `fetch`, sin Next, sin el SDK de nadie. Quién manda de
 * verdad es un adaptador de `src/infrastructure/email/`.
 */

export const ACCOUNT_EMAIL_KINDS = [
  "account.received",
  "account.approved",
  "account.declined",
] as const;

export const PLEDGE_EMAIL_KINDS = [
  "pledge.confirmed",
  "pledge.reminder",
  "pledge.fulfilled",
] as const;

export const STAFF_EMAIL_KINDS = [
  "staff.new_account",
  "staff.new_pledge",
  "staff.pledge_cancelled",
  "staff.pledge_expired",
] as const;

export const EMAIL_KINDS = [
  ...ACCOUNT_EMAIL_KINDS,
  ...PLEDGE_EMAIL_KINDS,
  ...STAFF_EMAIL_KINDS,
] as const;

export type AccountEmailKind = (typeof ACCOUNT_EMAIL_KINDS)[number];
export type PledgeEmailKind = (typeof PLEDGE_EMAIL_KINDS)[number];
export type StaffEmailKind = (typeof STAFF_EMAIL_KINDS)[number];
export type EmailKind = (typeof EMAIL_KINDS)[number];

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  /**
   * El cuerpo sin formato, escrito a mano y no derivado del HTML: es el que leen
   * los clientes que bloquean formato, y una conversión automática deja enlaces
   * colgando y párrafos pegados.
   */
  readonly text: string;
  readonly html: string;
  /** Misma clave = mismo correo. Resend descarta el duplicado por 24 horas. */
  readonly idempotencyKey: string;
}

/**
 * Tres resultados, y ninguno es una excepción.
 *
 * Que un correo no salga **no es excepcional**: es uno de los tres finales
 * normales de esta operación, y el tipo obliga a quien llama a decidir qué hacer
 * con cada uno en lugar de dejar que un `throw` se lleve por delante una reserva
 * que ya está hecha (FR-233).
 *
 * `skipped` existe separado de `failed` porque son cosas distintas y se responden
 * distinto: la primera es una decisión de despliegue —no hay credencial— y la
 * segunda es un problema que alguien tiene que mirar. Confundirlas haría que un
 * entorno sin configurar se viera como un proveedor caído.
 */
export type EmailResult =
  | { readonly status: "sent"; readonly providerId: string }
  | { readonly status: "failed"; readonly error: string }
  | { readonly status: "skipped"; readonly reason: "not-configured" };

export interface EmailSender {
  send(kind: EmailKind, message: EmailMessage): Promise<EmailResult>;
}

/**
 * La clave de idempotencia: `<kind>/<subject_id>`.
 *
 * El sujeto es la reserva o la cuenta, según la clase. Estable —se puede
 * recalcular en un reintento sin guardarla— y sin nada personal adentro: viaja
 * en una cabecera hacia un tercero, así que no puede llevar el correo de nadie.
 *
 * Esta capa **no alcanza sola**: la clave de Resend vence a las 24 horas. La
 * deduplicación permanente es `email_deliveries` (y `pledges.reminded_at` para el
 * recordatorio diario).
 */
export function idempotencyKeyFor(kind: EmailKind, subjectId: string): string {
  return `${kind}/${subjectId}`;
}

export function isStaffEmailKind(kind: EmailKind): kind is StaffEmailKind {
  return kind.startsWith("staff.");
}
