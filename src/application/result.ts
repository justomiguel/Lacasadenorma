/**
 * Resultado de una lectura que puede no estar disponible.
 *
 * Es un tipo y no una excepción porque FR-034 no describe un error: describe un
 * estado legítimo del sistema. Sin Supabase configurado, el sitio tiene que
 * mostrar el contenido editorial y **omitir** las cifras con un aviso. Que sea
 * una unión discriminada obliga a la presentación a manejar los dos casos: no se
 * puede leer `.data` sin haber comprobado el estado, y por lo tanto no se puede
 * degradar a ceros por descuido (principio XII).
 */

export type UnavailableReason =
  /** No hay credenciales configuradas. Es el estado esperado en un clon nuevo. */
  | "not-configured"
  /** Hay credenciales pero la consulta falló. Ya quedó registrado en el log. */
  | "error"
  /** La campaña todavía no fue publicada. */
  | "not-published";

export type DataResult<T> =
  | { readonly status: "ok"; readonly data: T }
  | { readonly status: "unavailable"; readonly reason: UnavailableReason };

export function ok<T>(data: T): DataResult<T> {
  return { status: "ok", data };
}

export function unavailable<T>(reason: UnavailableReason): DataResult<T> {
  return { status: "unavailable", reason };
}

/**
 * Mensaje para la persona que está leyendo. Nunca detalle técnico (amenaza I6).
 *
 * Sin sustantivo propio a propósito: el mismo texto acompaña a las cifras de la
 * transparencia, al índice de novedades y a las respuestas de la API. Quién es el
 * dato ausente lo dice el título de cada aviso; esto dice por qué falta.
 */
export const UNAVAILABLE_MESSAGES: Record<UnavailableReason, string> = {
  "not-configured":
    "Esta parte del sitio todavía no está conectada a los datos de la campaña. En cuanto lo esté, aparece acá.",
  error:
    "No pudimos leer estos datos en este momento. Volvé a intentar en un rato: el problema es nuestro, no tuyo.",
  "not-published": "La campaña todavía no está publicada.",
};
