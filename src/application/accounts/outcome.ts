/**
 * El resultado de una operación sobre la propia cuenta, **sin el texto**.
 *
 * Es la diferencia que obliga el bilingüismo. El backoffice devuelve mensajes en
 * castellano desde la capa de aplicación y está bien, porque el backoffice no se
 * traduce (ADR-023). Las pantallas de `/cuenta` existen en los dos idiomas, así
 * que una acción que devolviera "Revisá los datos" obligaría a `/en/cuenta` a
 * mostrar castellano o a la capa de aplicación a conocer el idioma de la página.
 * Devuelve un código; el texto sale de `content/*<locale>*​/cuenta.json`, que es
 * donde vive todo lo que una persona lee.
 *
 * El acoplamiento entre esta lista y esos dos JSON no queda librado a la
 * memoria: `content/schema.test.ts` afirma que cada código tiene su frase en los
 * dos idiomas, así que agregar un código sin traducirlo rompe el build.
 */
export const ACCOUNT_ERROR_CODES = [
  /** No hay proyecto de Supabase configurado. En un clon nuevo es lo normal. */
  "notConfigured",
  /** La acción se invocó sin sesión, o la sesión venció en el medio (amenaza T7). */
  "noSession",
  "emailInvalid",
  "passwordShort",
  "passwordMismatch",
  /** Inicio de sesión fallido. **Uno solo para los dos campos**, a propósito. */
  "credentials",
  /** El proyecto llegó al límite de correos o de intentos por hora. */
  "rateLimited",
  /** Pidió aparecer con nombre y no escribió ninguno. */
  "displayNameRequired",
  /** `/cuenta/clave` sin la sesión que crea el enlace de recuperación. */
  "noRecoverySession",
  /** El enlace del correo venció o ya se usó. */
  "linkExpired",
  /** Una cuenta con rol interno no se borra desde el sitio público. */
  "internalRole",
  /** Cualquier otra cosa. Ya quedó en el registro del servidor (amenaza I6). */
  "failed",
] as const;

export type AccountErrorCode = (typeof ACCOUNT_ERROR_CODES)[number];

/** El campo del formulario que hay que señalar, cuando hay uno. */
export type AccountField = "email" | "password" | "confirmPassword" | "displayName";

export type AccountOutcome<T> =
  | { readonly status: "ok"; readonly value: T }
  | {
      readonly status: "error";
      readonly code: AccountErrorCode;
      readonly field: AccountField | null;
    };

export function accountOk<T>(value: T): AccountOutcome<T> {
  return { status: "ok", value };
}

export function accountError<T>(
  code: AccountErrorCode,
  field: AccountField | null = null,
): AccountOutcome<T> {
  return { status: "error", code, field };
}
