import type { AccountFormState } from "@/app/(es)/cuenta/form-state";
import type { AccountField } from "@/src/application/accounts/outcome";
import type { AccountContent } from "@/content/schema";

/**
 * De código a frase, en el idioma de la pantalla.
 *
 * Las dos funciones son la misma consulta hecha desde los dos lugares que
 * necesitan hacerla, y por eso están separadas: un error de campo se pinta **bajo
 * el campo** y uno general arriba del botón. Mostrar los dos sería decir lo mismo
 * dos veces; mostrar sólo el general dejaría el campo equivocado sin señalar, que
 * es justo lo que hace falta en un teléfono donde el formulario no entra en
 * pantalla.
 */

/** El mensaje del campo, o `undefined` si el error no es de este campo. */
export function fieldError(
  state: AccountFormState,
  errors: AccountContent["errors"],
  field: AccountField,
): string | undefined {
  return state.phase === "error" && state.field === field
    ? errors[state.code]
    : undefined;
}

/** El mensaje general, o `null` si no hay error o si ya lo muestra un campo. */
export function generalError(
  state: AccountFormState,
  errors: AccountContent["errors"],
): string | null {
  return state.phase === "error" && state.field === null ? errors[state.code] : null;
}
