import type { AccountErrorCode, AccountField } from "@/src/application/accounts/outcome";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/src/i18n/locale";

/**
 * El estado que `useActionState` lleva y trae entre el formulario y el servidor.
 *
 * Vive en su propio archivo y no junto a las acciones porque un módulo
 * `"use server"` sólo puede exportar funciones asíncronas: una constante o un tipo
 * ahí adentro rompe el build. La separación no es estilo, es la regla del
 * framework.
 *
 * Es una unión de tres fases y no un objeto con `error` y `success` anulables.
 * `done` no es "sin error": en `/cuenta/crear` significa "revisá tu correo" y en
 * `/cuenta/recuperar` significa "si esa dirección existe, le llegó un enlace". Un
 * booleano obligaría a cada formulario a adivinar cuál de las dos cosas mostrar.
 *
 * Y nunca lleva texto: lleva el código, y el texto sale de `cuenta.json` en el
 * idioma de la página (`src/application/accounts/outcome.ts`).
 */
export type AccountFormState =
  | { readonly phase: "idle" }
  | { readonly phase: "done" }
  | {
      readonly phase: "error";
      readonly code: AccountErrorCode;
      readonly field: AccountField | null;
    };

export const IDLE: AccountFormState = { phase: "idle" };

export function failure(
  code: AccountErrorCode,
  field: AccountField | null = null,
): AccountFormState {
  return { phase: "error", code, field };
}

/** Un intento de sesión fallido. **Sin campo**: no se dice cuál de los dos falló. */
export function credentials(): AccountFormState {
  return failure("credentials");
}

export function rateLimited(): AccountFormState {
  return failure("rateLimited");
}

/**
 * El idioma llega en un campo oculto del formulario.
 *
 * Podría derivarse del `Referer`, y sería peor: esa cabecera la manda el cliente,
 * se puede omitir y algunos proxies la borran. Acá el valor lo escribe la página,
 * que sabe en qué idioma se renderizó, y se valida contra la lista igual: es un
 * dato del formulario, así que llega del navegador y no se confía en él.
 */
export function localeOf(formData: FormData): Locale {
  const candidate = textOf(formData, "idioma");

  return isLocale(candidate) ? candidate : DEFAULT_LOCALE;
}

/**
 * Un campo de texto del formulario, o la cadena vacía.
 *
 * `FormData.get` devuelve `string | File | null`, y `String(...)` sobre un `File`
 * da `"[object File]"`: una cadena de dieciséis caracteres que pasa cualquier
 * validación de "no está vacío". La comprobación de tipo convierte un envío
 * manipulado en un campo vacío, que es lo que la validación de abajo espera.
 */
export function textOf(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}
