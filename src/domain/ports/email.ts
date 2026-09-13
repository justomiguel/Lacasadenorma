/**
 * El puerto del correo del producto.
 *
 * Son cuatro correos y ninguno es de identidad: la confirmación de la cuenta, la
 * recuperación de la contraseña y el cambio de dirección los manda el servidor de
 * Auth por SMTP, porque llevan un token firmado que sólo él sabe emitir y que la
 * aplicación no tiene ni debería tener (ADR-028).
 *
 * TypeScript puro: sin `fetch`, sin Next, sin el SDK de nadie. Quien manda de
 * verdad es un adaptador de `src/infrastructure/email/`.
 */

export const EMAIL_KINDS = [
  "pledge.confirmed",
  "pledge.reminder",
  "pledge.fulfilled",
  "staff.new_pledge",
] as const;

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
 * La clave de idempotencia: `<kind>/<pledge_id>`.
 *
 * Estable —se puede recalcular en un reintento sin guardarla— y sin nada personal
 * adentro: viaja en una cabecera hacia un tercero, así que no puede llevar el
 * correo de nadie.
 *
 * Esta capa **no alcanza sola**, y conviene que quede escrito acá: la clave de
 * Resend vence a las 24 horas, y el proceso de recordatorios corre todos los días.
 * A las 25 horas ya no frenaría nada. La deduplicación permanente es
 * `pledges.reminded_at` más `email_deliveries` (FR-235, SC-210).
 */
export function idempotencyKeyFor(kind: EmailKind, pledgeId: string): string {
  return `${kind}/${pledgeId}`;
}
