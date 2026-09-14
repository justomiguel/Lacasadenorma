/**
 * Las cuatro secciones de `/cuenta`.
 *
 * No son rutas: son el índice de una sola página (ADR-037). El query `seccion`
 * recuerda cuál quedó abierta cuando un formulario vuelve a pintar el servidor.
 */

export const ACCOUNT_SECTIONS = ["reservas", "aparecer", "acceso", "borrar"] as const;

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

export const ACCOUNT_SECTION_PARAM = "seccion";

export function isAccountSection(value: string): value is AccountSection {
  return (ACCOUNT_SECTIONS as readonly string[]).includes(value);
}

export function resolveAccountSection(
  requested: string | null,
  hasPledges: boolean,
): AccountSection {
  if (requested !== null && isAccountSection(requested)) {
    return requested;
  }

  return hasPledges ? "reservas" : "aparecer";
}
