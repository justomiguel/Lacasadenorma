/**
 * Las secciones de `/cuenta`.
 *
 * No son rutas propias: son el índice de una sola página (ADR-037). El query
 * `seccion` distingue Mis donaciones de Tu cuenta. `aparecer`, `acceso` y
 * `borrar` siguen válidos: abren Tu cuenta y anclan el bloque.
 */

export const ACCOUNT_SECTIONS = [
  "reservas",
  "cuenta",
  "aparecer",
  "acceso",
  "borrar",
] as const;

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

export const ACCOUNT_SETTINGS_SECTIONS = [
  "cuenta",
  "aparecer",
  "acceso",
  "borrar",
] as const;

export type AccountSettingsSection = (typeof ACCOUNT_SETTINGS_SECTIONS)[number];

export const ACCOUNT_BLOCK_IDS = ["foto", "aparecer", "acceso", "borrar"] as const;

export type AccountBlockId = (typeof ACCOUNT_BLOCK_IDS)[number];

export const ACCOUNT_SECTION_PARAM = "seccion";

export function isAccountSettingsSection(
  value: AccountSection,
): value is AccountSettingsSection {
  return (ACCOUNT_SETTINGS_SECTIONS as readonly AccountSection[]).includes(value);
}

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

  return hasPledges ? "reservas" : "cuenta";
}

/** `aparecer` / `acceso` / `borrar` anclan un bloque. `cuenta` es el tope. */
export function accountBlockId(section: AccountSettingsSection): AccountBlockId | null {
  if (section === "cuenta") {
    return null;
  }

  return section;
}

export function accountSettingsHref(accountHref: string): string {
  return `${accountHref}?${ACCOUNT_SECTION_PARAM}=cuenta`;
}
